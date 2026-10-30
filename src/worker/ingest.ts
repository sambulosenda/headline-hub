import { and, eq, gt, inArray, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import { OUTLETS } from "../config/outlets";
import { closeDb, getDb } from "../db/client";
import { articles, feeds, outlets, stories } from "../db/schema";
import { tagCountries } from "../lib/countries";
import { refreshTrendingNames } from "../lib/entities";
import { getEmbedder, type Embedder } from "../lib/embeddings";
import { parseFeed, type FeedItem } from "../lib/feeds";
import { storyScore } from "../lib/ranking";
import { isAllowed, USER_AGENT } from "../lib/robots";
import { findStory, headline, type ClusterCandidate } from "../lib/similarity";

type Db = ReturnType<typeof getDb>;

const FEED_INTERVAL_MS = 5 * 60_000;
const CLUSTER_WINDOW_MS = 48 * 3_600_000;
const RESCORE_WINDOW_MS = 72 * 3_600_000;
const RESCORE_BATCH = 500;
/** Sites fetched at once. Each site's own feeds are fetched one after another, so no publisher sees parallel requests. */
const CONCURRENCY = 16;
const FETCH_TIMEOUT_MS = 15_000;
/** A failing feed waits 2^failures fetch intervals before its next try, up to this many doublings (about 5 hours). */
const MAX_BACKOFF_DOUBLINGS = 6;
const ROBOTS_TTL_MS = 6 * 3_600_000;
/** Reload clustering candidates from scratch this often, so recluster runs and pruning are picked up. */
const CANDIDATE_REFRESH_MS = 15 * 60_000;

/** Upsert outlets and feeds from config in two statements; deactivate anything removed from it. */
export async function syncConfig(db: Db) {
  const outletIds = OUTLETS.map((o) => o.id);
  const feedUrls = OUTLETS.flatMap((o) => o.feeds.map((f) => f.url));
  await db
    .insert(outlets)
    .values(
      OUTLETS.map((o) => ({
        id: o.id,
        name: o.name,
        homepage: o.homepage,
        region: o.region,
        kind: o.kind,
        quality: o.quality,
        country: o.country ?? null,
        active: true,
      })),
    )
    .onConflictDoUpdate({
      target: outlets.id,
      set: {
        name: sql`excluded.name`,
        homepage: sql`excluded.homepage`,
        region: sql`excluded.region`,
        kind: sql`excluded.kind`,
        quality: sql`excluded.quality`,
        country: sql`excluded.country`,
        active: true,
      },
    });
  await db
    .insert(feeds)
    .values(OUTLETS.flatMap((o) => o.feeds.map((f) => ({ url: f.url, outletId: o.id, topics: f.topics }))))
    .onConflictDoUpdate({
      target: feeds.url,
      set: { outletId: sql`excluded.outlet_id`, topics: sql`excluded.topics`, active: true },
    });
  await db.update(outlets).set({ active: false }).where(notInArray(outlets.id, outletIds));
  await db.update(feeds).set({ active: false }).where(notInArray(feeds.url, feedUrls));
}

const robotsCache = new Map<string, { at: number; text: Promise<string> }>();

async function robotsFor(origin: string): Promise<string> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.at < ROBOTS_TTL_MS) return cached.text;
  const text = fetch(`${origin}/robots.txt`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "");
  robotsCache.set(origin, { at: Date.now(), text });
  return text;
}

type FeedRow = typeof feeds.$inferSelect;

type FetchResult =
  | { kind: "ok"; xml: string; etag: string | null; lastModified: string | null; status: number }
  | { kind: "not-modified"; status: number }
  | { kind: "blocked" }
  | { kind: "error"; status: number | null; message: string };

async function fetchFeed(feed: FeedRow): Promise<FetchResult> {
  const url = new URL(feed.url);
  if (!isAllowed(await robotsFor(url.origin), url.pathname + url.search)) return { kind: "blocked" };
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5",
  };
  if (feed.etag) headers["If-None-Match"] = feed.etag;
  if (feed.lastModified) headers["If-Modified-Since"] = feed.lastModified;
  try {
    const res = await fetch(feed.url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.status === 304) return { kind: "not-modified", status: 304 };
    if (!res.ok) return { kind: "error", status: res.status, message: res.statusText };
    return {
      kind: "ok",
      xml: await res.text(),
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
      status: res.status,
    };
  } catch (err) {
    return { kind: "error", status: null, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Store new items, merge topics for known ones, and assign each new article to
 * a story. Mutates `candidates` so later items in the run can join new stories.
 */
export async function storeItems(
  db: Db,
  feed: Pick<FeedRow, "outletId" | "topics">,
  items: FeedItem[],
  candidates: ClusterCandidate[],
  now = new Date(),
  embed: Embedder | null = null,
): Promise<{ touched: Set<number>; added: number }> {
  const touched = new Set<number>();
  let added = 0;
  if (items.length === 0) return { touched, added };

  const existing = await db
    .select({ url: articles.url, storyId: articles.storyId })
    .from(articles)
    .where(inArray(articles.url, items.map((i) => i.url)));
  const known = new Map(existing.map((e) => [e.url, e.storyId]));
  // Topic slugs are config-defined identifiers, so a Postgres array literal is safe here.
  const topicsLiteral = `{${feed.topics.join(",")}}`;

  const fresh = items.filter((i) => !known.has(i.url));
  const vectors = embed && fresh.length > 0 ? await embedSafely(embed, fresh.map((i) => i.title)) : null;
  const embeddingOf = new Map(fresh.map((item, i) => [item.url, vectors?.[i] ?? null]));

  // Most of a feed is items we already have; merge their topics in one statement, skipping rows that have them all.
  const seen = items.filter((i) => known.has(i.url)).map((i) => i.url);
  if (seen.length > 0) {
    await db
      .update(articles)
      .set({ topics: sql`(select array(select distinct unnest(${articles.topics} || ${topicsLiteral}::text[])))` })
      .where(and(inArray(articles.url, seen), sql`not (${articles.topics} @> ${topicsLiteral}::text[])`));
    for (const url of seen) {
      const storyId = known.get(url);
      if (storyId) touched.add(storyId);
    }
  }

  for (const item of items) {
    if (known.has(item.url)) continue;

    const embedding = embeddingOf.get(item.url) ?? null;
    const match = headline(item.title, embedding);
    const publishedAt = item.publishedAt ?? now;
    let storyId = findStory(match, candidates);
    if (storyId === null) {
      const [story] = await db
        .insert(stories)
        .values({ title: item.title, topics: feed.topics, firstSeenAt: publishedAt, lastSeenAt: publishedAt })
        .returning({ id: stories.id });
      storyId = story.id;
    }

    const inserted = await db
      .insert(articles)
      .values({
        url: item.url,
        outletId: feed.outletId,
        storyId,
        title: item.title,
        summary: item.summary,
        imageUrl: item.imageUrl,
        topics: feed.topics,
        countries: tagCountries(item.title, item.summary),
        tokens: match.tokens,
        embedding,
        publishedAt,
      })
      .onConflictDoNothing({ target: articles.url })
      .returning({ id: articles.id });
    if (inserted.length === 0) continue;

    known.set(item.url, storyId);
    candidates.push({ ...match, storyId });
    touched.add(storyId);
    added++;
  }
  return { touched, added };
}

async function embedSafely(embed: Embedder, texts: string[]): Promise<number[][] | null> {
  try {
    return await embed(texts);
  } catch (err) {
    console.warn("[ingest] embedding failed, falling back to word overlap:", err);
    return null;
  }
}

/**
 * A story's countries: every country its headlines name, plus a national
 * outlet's home country when that country's outlets make up at least half the
 * story's coverage. So a Herald local story counts for Zimbabwe, but world
 * news a Zimbabwean paper happens to run does not.
 */
export function storyCountries(storyId: SQL) {
  return sql`coalesce((select array_agg(distinct c order by c) from (
      select unnest(a.countries) as c from articles a where a.story_id = ${storyId}
      union
      select o.country from articles a join outlets o on o.id = a.outlet_id
      where a.story_id = ${storyId} and o.country is not null
      group by o.country
      having count(distinct a.outlet_id) * 2 >= (select count(distinct x.outlet_id) from articles x where x.story_id = ${storyId})
    ) t), '{}')`;
}

interface StoryAggregate extends Record<string, unknown> {
  story_id: number;
  outlet_count: number;
  recent_outlets: number;
  avg_quality: number;
  first_seen: Date;
  last_seen: Date;
  topics: string[];
  countries: string[];
  lead_id: number;
  lead_title: string;
}

/** Recompute breadth, lead headline, topics, countries and score for recent stories. */
export async function rescoreStories(db: Db, now = new Date()) {
  const since = new Date(now.getTime() - RESCORE_WINDOW_MS);
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const rows = await db.execute<StoryAggregate>(sql`
    with recent as (
      select id from stories where last_seen_at > ${since.toISOString()}::timestamptz
    ),
    per_outlet as (
      select a.story_id, a.outlet_id, o.quality, min(a.published_at) as first_seen, max(a.published_at) as last_seen
      from articles a join outlets o on o.id = a.outlet_id
      where a.story_id in (select id from recent)
      group by a.story_id, a.outlet_id, o.quality
    ),
    lead as (
      select distinct on (a.story_id) a.story_id, a.id, a.title
      from articles a join outlets o on o.id = a.outlet_id
      where a.story_id in (select id from recent)
      order by a.story_id, o.quality desc, a.published_at asc
    ),
    topics as (
      select story_id, array_agg(distinct t) as topics
      from articles a, unnest(a.topics) t
      where a.story_id in (select id from recent)
      group by story_id
    )
    select p.story_id,
           count(*)::int as outlet_count,
           (count(*) filter (where p.first_seen > ${hourAgo.toISOString()}::timestamptz))::int as recent_outlets,
           avg(p.quality)::float8 as avg_quality,
           min(p.first_seen) as first_seen,
           max(p.last_seen) as last_seen,
           t.topics,
           ${storyCountries(sql`p.story_id`)} as countries,
           l.id as lead_id,
           l.title as lead_title
    from per_outlet p
    join lead l on l.story_id = p.story_id
    join topics t on t.story_id = p.story_id
    group by p.story_id, t.topics, l.id, l.title
  `);

  const updates = rows.map((r) => {
    const firstSeenAt = new Date(r.first_seen);
    const lastSeenAt = new Date(r.last_seen);
    const score = storyScore(
      {
        outletCount: r.outlet_count,
        avgQuality: r.avg_quality,
        recentOutlets: r.recent_outlets,
        firstSeenAt,
        lastSeenAt,
      },
      now,
    );
    return {
      id: r.story_id,
      title: r.lead_title,
      lead_id: r.lead_id,
      topics: r.topics,
      countries: r.countries,
      outlet_count: r.outlet_count,
      recent_outlets: r.recent_outlets,
      avg_quality: r.avg_quality,
      first_seen: firstSeenAt.toISOString(),
      last_seen: lastSeenAt.toISOString(),
      score,
    };
  });
  // Thousands of recent stories at 300+ feeds: write them in a few statements, not one per story.
  for (let i = 0; i < updates.length; i += RESCORE_BATCH) {
    const batch = JSON.stringify(updates.slice(i, i + RESCORE_BATCH));
    await db.execute(sql`update stories s set
        title = v.title, lead_article_id = v.lead_id, topics = v.topics, countries = v.countries,
        outlet_count = v.outlet_count, recent_outlets = v.recent_outlets, avg_quality = v.avg_quality,
        first_seen_at = v.first_seen, last_seen_at = v.last_seen, score = v.score
      from jsonb_to_recordset(${batch}::jsonb) as v(
        id int, title text, lead_id int, topics text[], countries text[], outlet_count int,
        recent_outlets int, avg_quality real, first_seen timestamptz, last_seen timestamptz, score real)
      where s.id = v.id`);
  }
  // Saves on a story that reclustering emptied follow its lead article to the story it joined.
  await db.execute(sql`insert into saved_stories (user_id, story_id, article_id, created_at)
    select ss.user_id, a.story_id, ss.article_id, ss.created_at
    from saved_stories ss join articles a on a.id = ss.article_id
    where a.story_id is not null and a.story_id <> ss.story_id
      and not exists (select 1 from articles x where x.story_id = ss.story_id)
    on conflict do nothing`);
  // A story can be created and then lose its article to a concurrent insert of the same URL.
  await db.execute(sql`delete from stories s where not exists (select 1 from articles a where a.story_id = s.id)`);
  return rows.length;
}

async function loadCandidates(db: Db, now: Date): Promise<ClusterCandidate[]> {
  const rows = await db
    .select({ storyId: articles.storyId, title: articles.title, embedding: articles.embedding })
    .from(articles)
    .where(gt(articles.publishedAt, new Date(now.getTime() - CLUSTER_WINDOW_MS)));
  return rows.flatMap((r) => (r.storyId === null ? [] : [{ ...headline(r.title, r.embedding), storyId: r.storyId }]));
}

/**
 * Two days of headlines with embeddings is tens of megabytes at 300+ feeds, so
 * watch mode keeps them between runs (storeItems appends new ones) and only
 * reloads every CANDIDATE_REFRESH_MS, or after a failed store.
 */
let candidateCache: { loadedAt: number; list: ClusterCandidate[] } | null = null;

async function cachedCandidates(db: Db, now: Date): Promise<ClusterCandidate[]> {
  if (!candidateCache || now.getTime() - candidateCache.loadedAt > CANDIDATE_REFRESH_MS) {
    candidateCache = { loadedAt: now.getTime(), list: await loadCandidates(db, now) };
  }
  return candidateCache.list;
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) await fn(next);
    }),
  );
}

/** Group feeds by host so each publisher gets one request at a time. */
export function byHost<T extends { url: string }>(rows: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const host = new URL(row.url).hostname;
    groups.set(host, [...(groups.get(host) ?? []), row]);
  }
  return [...groups.values()];
}

/** Feeds never fetched, or last fetched long enough ago given how often they have failed in a row. */
function dueFeeds(now: Date) {
  return and(
    eq(feeds.active, true),
    or(
      isNull(feeds.lastFetchedAt),
      sql`${feeds.lastFetchedAt} < ${now.toISOString()}::timestamptz
        - make_interval(secs => ${FEED_INTERVAL_MS / 1000} * power(2, least(${feeds.consecutiveFailures}, ${MAX_BACKOFF_DOUBLINGS})))`,
    ),
  );
}

const NAMES_REFRESH_MS = 10 * 60_000;
let lastNamesRefresh = 0;

export async function runOnce(db: Db) {
  const now = new Date();
  await syncConfig(db);
  const due = await db.select().from(feeds).where(dueFeeds(now));
  const candidates = await cachedCandidates(db, now);
  const embed = await getEmbedder();
  let added = 0;
  let failed = 0;

  const fail = async (feed: FeedRow, set: Partial<FeedRow>) => {
    failed++;
    await db
      .update(feeds)
      .set({ lastFetchedAt: new Date(), ...set, consecutiveFailures: feed.consecutiveFailures + 1 })
      .where(eq(feeds.url, feed.url));
  };

  const ingestFeed = async (feed: FeedRow) => {
    const result = await fetchFeed(feed);
    const base = { lastFetchedAt: new Date() };
    if (result.kind === "ok") {
      try {
        const items = await parseFeed(result.xml);
        added += (await storeItems(db, feed, items, candidates, new Date(), embed)).added;
        await db
          .update(feeds)
          .set({ ...base, etag: result.etag, lastModified: result.lastModified, lastStatus: result.status, lastError: null, consecutiveFailures: 0 })
          .where(eq(feeds.url, feed.url));
      } catch (err) {
        // A store can fail on a story that recluster removed; start from fresh candidates next run.
        candidateCache = null;
        const message = err instanceof Error ? err.message : String(err);
        await fail(feed, { lastStatus: result.status, lastError: `parse: ${message}` });
      }
    } else if (result.kind === "not-modified") {
      await db.update(feeds).set({ ...base, lastStatus: 304, lastError: null, consecutiveFailures: 0 }).where(eq(feeds.url, feed.url));
    } else if (result.kind === "blocked") {
      // Counted as a failure so backoff stops us asking; it recovers by itself if the site changes its robots.txt.
      await fail(feed, { lastError: "blocked by robots.txt" });
    } else {
      await fail(feed, { lastStatus: result.status, lastError: result.message });
    }
  };

  await pool(byHost(due), CONCURRENCY, async (group) => {
    for (const feed of group) await ingestFeed(feed);
  });

  const rescored = await rescoreStories(db);
  // Recounting names reads a day of headlines, so only when something changed or it's getting stale.
  let names = "skipped";
  if (added > 0 || now.getTime() - lastNamesRefresh > NAMES_REFRESH_MS) {
    names = String(await refreshTrendingNames(db, now));
    lastNamesRefresh = now.getTime();
  }
  console.log(
    `[ingest] feeds=${due.length} failed=${failed} new_articles=${added} stories_rescored=${rescored} names=${names} embeddings=${embed ? "on" : "off"} took=${Math.round((Date.now() - now.getTime()) / 1000)}s`,
  );
}

async function main() {
  const db = getDb();
  const watch = process.argv.includes("--watch");
  do {
    try {
      await runOnce(db);
    } catch (err) {
      console.error("[ingest] run failed", err);
      if (!watch) process.exitCode = 1;
    }
    if (watch) await new Promise((r) => setTimeout(r, 60_000));
  } while (watch);
  await closeDb();
}

if (process.argv[1]?.endsWith("ingest.ts")) {
  void main();
}
