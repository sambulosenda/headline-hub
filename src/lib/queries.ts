import { and, arrayContains, desc, eq, gt, gte, inArray, notInArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles, outlets, stories } from "@/db/schema";
import { wordPattern, type Mutes } from "@/lib/mutes";

export const DEVELOPING_FRESH_HOURS = 3;

export interface FeedFilters {
  topic?: string;
  /** Country code (src/config/countries.ts): stories about that country. */
  country?: string;
  /** Only stories updated in this many hours. */
  hours: number;
  region?: import("@/config/outlets").Region;
  /** Only stories still gaining outlets, ordered by how fast. */
  developing?: boolean;
  /** Sources, topics and keywords the reader has hidden. */
  mutes?: Mutes;
  /** Only stories whose headlines or summaries contain one of these phrases (an entity's terms). */
  mentions?: string[];
}

/** Same expression as the full-text index on articles (src/db/schema.ts), so the index is used. */
const articleText = sql`to_tsvector('english', ${articles.title} || ' ' || ${articles.summary})`;

/** Article ids whose text contains any of the phrases. */
function mentionsAny(phrases: string[]): SQL {
  return sql.join(
    phrases.map((p) => sql`phraseto_tsquery('english', ${p})`),
    sql` || `,
  );
}

/** Postgres text[] literal; only ever built from config-validated ids. */
function textArray(values: string[]) {
  return `{${values.join(",")}}`;
}

/** Keyword mutes as "title contains any of these words" over a given title column. */
function titleMatchesAny(title: SQL | typeof articles.title, keywords: string[]): SQL {
  return sql.join(
    keywords.map((k) => sql`${title} ~* ${wordPattern(k)}`),
    sql` or `,
  );
}

/** Story-level mute conditions: hide muted topics and keywords, and stories only muted outlets cover. */
function storyMuteConditions(mutes: Mutes | undefined, pageTopic?: string): SQL[] {
  if (!mutes) return [];
  const conditions: SQL[] = [];
  // Visiting a topic page you muted still shows it; muting hides it everywhere else.
  const topics = mutes.topics.filter((t) => t !== pageTopic);
  if (topics.length > 0) conditions.push(sql`not (${stories.topics} && ${textArray(topics)}::text[])`);
  if (mutes.outlets.length > 0) {
    conditions.push(sql`exists (select 1 from articles ma where ma.story_id = ${stories.id}
      and ma.outlet_id <> all(${textArray(mutes.outlets)}::text[]))`);
  }
  if (mutes.keywords.length > 0) {
    conditions.push(sql`not exists (select 1 from articles mk where mk.story_id = ${stories.id}
      and (${titleMatchesAny(sql`mk.title`, mutes.keywords)}))`);
  }
  return conditions;
}

export interface CoverageItem {
  id: number;
  outletId: string;
  url: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: Date;
  outletName: string;
  outletRegion: string;
  /** The outlet's home country, for national outlets. */
  outletCountry: string | null;
}

export interface StoryWithCoverage {
  id: number;
  title: string;
  outletCount: number;
  recentOutlets: number;
  avgQuality: number;
  score: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  topics: string[];
  /** Countries the story is about (src/config/countries.ts). */
  countries: string[];
  coverage: CoverageItem[];
}

function coverageSelect() {
  return {
    id: articles.id,
    outletId: articles.outletId,
    storyId: articles.storyId,
    url: articles.url,
    title: articles.title,
    summary: articles.summary,
    imageUrl: articles.imageUrl,
    publishedAt: articles.publishedAt,
    outletName: outlets.name,
    outletRegion: outlets.region,
    outletCountry: outlets.country,
    quality: outlets.quality,
  };
}

/** Top stories, ranked by score, each with every outlet's version. */
export async function getTopStories(filters: FeedFilters, limit = 30): Promise<StoryWithCoverage[]> {
  const db = getDb();
  const since = new Date(Date.now() - filters.hours * 3_600_000);
  const conditions = [gt(stories.lastSeenAt, since)];
  if (filters.topic) conditions.push(arrayContains(stories.topics, [filters.topic]));
  if (filters.country) conditions.push(arrayContains(stories.countries, [filters.country]));
  if (filters.mentions?.length) {
    conditions.push(
      sql`${stories.id} in (select ${articles.storyId} from ${articles} where ${articleText} @@ (${mentionsAny(filters.mentions)}))`,
    );
  }
  if (filters.developing) {
    // Two or more outlets joined in the last hour, or a fresh story already
    // picked up by three outlets within three hours of first appearing.
    const freshSince = new Date(Date.now() - DEVELOPING_FRESH_HOURS * 3_600_000);
    conditions.push(
      or(
        gte(stories.recentOutlets, 2),
        and(gte(stories.outletCount, 3), gt(stories.firstSeenAt, freshSince)),
      )!,
    );
  }
  if (filters.region) {
    conditions.push(
      sql`exists (select 1 from ${articles} a join ${outlets} o on o.id = a.outlet_id
                  where a.story_id = ${stories.id} and o.region = ${filters.region})`,
    );
  }

  conditions.push(...storyMuteConditions(filters.mutes, filters.topic));

  const rows = await db
    .select()
    .from(stories)
    .where(and(...conditions))
    .orderBy(...(filters.developing ? [desc(stories.recentOutlets), desc(stories.score)] : [desc(stories.score)]))
    .limit(limit);
  if (rows.length === 0) return [];

  const coverage = await loadCoverage(rows.map((r) => r.id), filters.mutes?.outlets);
  return rows.map((r) => ({ ...r, coverage: coverage.get(r.id) ?? [] }));
}

/** Every outlet's version of each story, best outlet first. */
export async function loadCoverage(
  storyIds: number[],
  mutedOutlets: string[] = [],
): Promise<Map<number, CoverageItem[]>> {
  const byStory = new Map<number, CoverageItem[]>();
  if (storyIds.length === 0) return byStory;
  const coverage = await getDb()
    .select(coverageSelect())
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .where(
      and(
        inArray(articles.storyId, storyIds),
        mutedOutlets.length > 0 ? notInArray(articles.outletId, mutedOutlets) : undefined,
      ),
    )
    .orderBy(desc(outlets.quality), articles.publishedAt);

  for (const c of coverage) {
    const list = byStory.get(c.storyId!) ?? [];
    list.push(c);
    byStory.set(c.storyId!, list);
  }
  return byStory;
}

export interface LatestItem extends CoverageItem {
  storyId: number | null;
  storyOutletCount: number;
}

/** Newest headlines first, regardless of clustering. */
export async function getLatest(filters: Omit<FeedFilters, "hours">, limit = 60): Promise<LatestItem[]> {
  const db = getDb();
  const conditions = scopeConditions(filters);

  return db
    .select({ ...coverageSelect(), storyOutletCount: stories.outletCount })
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .innerJoin(stories, eq(stories.id, articles.storyId))
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export type ScopeFilters = Omit<FeedFilters, "hours">;

function scopeConditions(filters: ScopeFilters): SQL[] {
  const conditions: SQL[] = [eq(outlets.active, true)];
  if (filters.topic) conditions.push(arrayContains(articles.topics, [filters.topic]));
  // Story-level, so Latest agrees with Top about which stories belong to a country.
  if (filters.country) {
    conditions.push(sql`exists (select 1 from stories cs where cs.id = ${articles.storyId}
      and cs.countries @> ${`{${filters.country}}`}::text[])`);
  }
  if (filters.region) conditions.push(eq(outlets.region, filters.region));
  if (filters.mentions?.length) conditions.push(sql`${articleText} @@ (${mentionsAny(filters.mentions)})`);
  const mutes = filters.mutes;
  if (mutes) {
    if (mutes.outlets.length > 0) conditions.push(notInArray(articles.outletId, mutes.outlets));
    const topics = mutes.topics.filter((t) => t !== filters.topic);
    if (topics.length > 0) conditions.push(sql`not (${articles.topics} && ${textArray(topics)}::text[])`);
    if (mutes.keywords.length > 0) conditions.push(sql`not (${titleMatchesAny(articles.title, mutes.keywords)})`);
  }
  return conditions;
}

/** Newest article id in scope: the marker a page sends back to ask "what's new since I loaded?". */
export async function getLatestArticleId(filters: ScopeFilters): Promise<number> {
  const [row] = await getDb()
    .select({ id: sql<number | null>`max(${articles.id})` })
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .where(and(...scopeConditions(filters)));
  return row?.id ?? 0;
}

export interface UpdateCounts {
  /** Stories that did not exist when the page loaded. */
  newStories: number;
  /** Existing stories that gained coverage since then. */
  updatedStories: number;
  latestId: number;
}

/**
 * What changed in scope since an article id, counted per story. With storyLevel,
 * stories the story feeds hide (by topic, keyword or outlet mutes) aren't counted.
 */
export async function countUpdates(filters: ScopeFilters, sinceId: number, storyLevel = false): Promise<UpdateCounts> {
  const db = getDb();
  const fresh = await db
    .select({
      storyId: articles.storyId,
      maxId: sql<number>`max(${articles.id})`.mapWith(Number),
      isNew: sql<boolean>`bool_and(not exists (
        select 1 from articles old where old.story_id = ${articles.storyId} and old.id <= ${sinceId}
      ))`,
    })
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .innerJoin(stories, eq(stories.id, articles.storyId))
    .where(
      and(
        gt(articles.id, sinceId),
        ...scopeConditions(filters),
        ...(storyLevel ? storyMuteConditions(filters.mutes, filters.topic) : []),
      ),
    )
    .groupBy(articles.storyId);

  const newStories = fresh.filter((f) => f.isNew).length;
  return {
    newStories,
    updatedStories: fresh.length - newStories,
    latestId: Math.max(sinceId, ...fresh.map((f) => f.maxId)),
  };
}

export interface Newsroom {
  id: string;
  name: string;
  homepage: string;
  /** Headlines in the last day. */
  recent: number;
}

/** A country's own outlets we read, busiest first. */
export async function getNewsrooms(country: string, hours = 24): Promise<Newsroom[]> {
  const since = new Date(Date.now() - hours * 3_600_000);
  return getDb()
    .select({
      id: outlets.id,
      name: outlets.name,
      homepage: outlets.homepage,
      recent: sql<number>`count(${articles.id})::int`,
    })
    .from(outlets)
    .leftJoin(articles, and(eq(articles.outletId, outlets.id), gt(articles.publishedAt, since)))
    .where(and(eq(outlets.country, country), eq(outlets.active, true)))
    .groupBy(outlets.id)
    .orderBy(desc(sql`count(${articles.id})`), desc(outlets.quality));
}

export interface MentionStats {
  /** Headlines mentioning the name per day, oldest first, one entry for every day including quiet ones. */
  days: { day: string; count: number }[];
  /** Outlets that mentioned the name most over the period. */
  outlets: { id: string; name: string; count: number }[];
}

/** How often a name has been in the headlines lately, and who has been writing about it. */
export async function getMentionStats(phrases: string[], days = 7, topOutlets = 5): Promise<MentionStats> {
  const db = getDb();
  const since = new Date(Date.now() - days * 86_400_000);
  const match = and(gt(articles.publishedAt, since), sql`${articleText} @@ (${mentionsAny(phrases)})`);
  const day = sql<string>`to_char(date_trunc('day', ${articles.publishedAt} at time zone 'UTC'), 'YYYY-MM-DD')`;
  const [perDay, perOutlet] = await Promise.all([
    db.select({ day, count: sql<number>`count(*)::int` }).from(articles).where(match).groupBy(day),
    db
      .select({ id: outlets.id, name: outlets.name, count: sql<number>`count(*)::int` })
      .from(articles)
      .innerJoin(outlets, eq(outlets.id, articles.outletId))
      .where(match)
      .groupBy(outlets.id)
      .orderBy(desc(sql`count(*)`), desc(outlets.quality))
      .limit(topOutlets),
  ]);
  const counts = new Map(perDay.map((d) => [d.day, d.count]));
  const filled = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day: d, count: counts.get(d) ?? 0 };
  });
  return { days: filled, outlets: perOutlet };
}
