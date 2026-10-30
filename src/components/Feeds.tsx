import { connection } from "next/server";
import { Filters } from "./Filters";
import { LiveUpdates } from "./LiveUpdates";
import Link from "next/link";
import { Suspense } from "react";
import { StoryCard, StoryList } from "./StoryCard";
import { outboundUrl } from "@/lib/normalize";
import { parseFilters, timeAgo, type SearchParams } from "@/lib/filters";
import { getLatest, getLatestArticleId, getTopStories, type FeedFilters } from "@/lib/queries";
import { storyPath } from "@/lib/slug";
import { createHash } from "node:crypto";
import { serializeMutes, type Mutes } from "@/lib/mutes";
import { getMutes } from "@/lib/mutes-server";
import { savedByCurrentUser } from "@/lib/saved";

function mutesKey(mutes: Mutes) {
  return createHash("sha256").update(serializeMutes(mutes)).digest("hex").slice(0, 8);
}

/** Narrows a feed to stories naming an entity, or everything the reader follows. */
interface MentionProps {
  /** Phrases to match; must be non-empty when given. */
  mentions?: string[];
  /** Entity slug, so live updates match the same stories. */
  entity?: string;
  /** This is the Following page. */
  following?: boolean;
  empty?: { title: string; body: string };
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

function loadError(err: unknown) {
  console.error(err);
  return <Notice title="Couldn't load the news" body="Check DATABASE_URL and that the ingest worker has run." />;
}

export async function TopStories({
  pathname,
  searchParams,
  topic,
  country,
  developing = false,
  mentions,
  entity,
  following = false,
  empty,
}: {
  pathname: string;
  searchParams: Promise<SearchParams>;
  topic?: string;
  country?: string;
  developing?: boolean;
} & MentionProps) {
  const params = await searchParams;
  const filters = { ...parseFilters(params, topic), country, developing, mentions, mutes: await getMutes() };
  // News must be fresh per request, never baked into the prerendered shell.
  // Called outside the try so its prerender signal isn't swallowed.
  await connection();
  let stories, since, saved;
  try {
    [stories, since] = await Promise.all([
      getTopStories(filters).then((all) => all.filter((s) => s.coverage.length > 0)),
      getLatestArticleId(filters),
    ]);
    saved = await savedByCurrentUser(stories.map((s) => s.id));
  } catch (err) {
    return loadError(err);
  }

  // Pages with a Latest view of their own link the rail's "See all" there.
  const latestHref = pathname === "/" ? "/latest" : topic || country || entity ? `${pathname}?view=latest` : undefined;

  return (
    // data-wide lets the page widen on large screens to fit the rail (see the layout).
    <div data-wide className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
    <div className="space-y-4">
      <LiveUpdates
        since={since}
        topic={filters.topic}
        region={filters.region}
        country={filters.country}
        entity={entity}
        following={following}
        stories
        mutesKey={mutesKey(filters.mutes)}
      />
      <Filters pathname={pathname} params={params} filters={filters} />
      {stories.length === 0 ? (
        <Notice
          title={empty?.title ?? (developing ? "Nothing developing right now" : "No stories yet")}
          body={
            empty?.body ??
            (developing
              ? "Stories show here while outlets are still picking them up. Check back soon."
              : "Try a longer time window, or run the ingest worker.")
          }
        />
      ) : (
        <StoryList>
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} mutedTopics={filters.mutes.topics} saved={saved.has(s.id)} />
          ))}
        </StoryList>
      )}
    </div>
      <Suspense fallback={null}>
        <Rail filters={filters} latestHref={latestHref} showDeveloping={!developing} />
      </Suspense>
    </div>
  );
}

const RAIL_LATEST = 12;

function onePerStory<T extends { storyId: number | null }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((a) => a.storyId === null || (!seen.has(a.storyId) && seen.add(a.storyId)));
}
const RAIL_DEVELOPING = 5;

/** Right-hand column on wide screens: what's developing and the newest headlines, in the same scope as the feed. */
async function Rail({
  filters,
  latestHref,
  showDeveloping,
}: {
  filters: FeedFilters;
  latestHref?: string;
  showDeveloping: boolean;
}) {
  let latest, developing;
  try {
    [latest, developing] = await Promise.all([
      // Fetch extra so there are still enough after keeping one headline per story.
      getLatest(filters, RAIL_LATEST * 3).then((items) => onePerStory(items).slice(0, RAIL_LATEST)),
      showDeveloping ? getTopStories({ ...filters, developing: true }, RAIL_DEVELOPING) : [],
    ]);
  } catch (err) {
    console.error(err);
    return null;
  }
  const heading = "mb-2 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <aside className="hidden space-y-6 self-start lg:sticky lg:top-28 lg:block" aria-label="More headlines">
      {developing.length > 0 && (
        <section>
          <h2 className={heading}>
            <span className="text-warn">Developing</span>
            <Link href="/developing" className="font-normal normal-case tracking-normal hover:text-accent">
              See all
            </Link>
          </h2>
          <ul className="space-y-2.5 text-sm">
            {developing.map((s) => (
              <li key={s.id}>
                <Link href={storyPath(s.id, s.title)} className="font-medium leading-snug hover:underline">
                  {s.title}
                </Link>
                <p className="text-xs text-muted">
                  {s.outletCount} sources
                  {s.recentOutlets > 0 && ` · ${s.recentOutlets} joined in the last hour`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {latest.length > 0 && (
        <section>
          <h2 className={heading}>
            <span>Latest</span>
            {latestHref && (
              <Link href={latestHref} className="font-normal normal-case tracking-normal hover:text-accent">
                See all
              </Link>
            )}
          </h2>
          <ul className="space-y-2.5 text-sm">
            {latest.map((a) => (
              <li key={a.id}>
                <a href={outboundUrl(a.url)} data-outbound="1" className="leading-snug hover:underline" target="_blank" rel="noopener">
                  {a.title}
                </a>
                <p className="text-xs text-muted">
                  {a.outletName} · {timeAgo(a.publishedAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

export async function LatestHeadlines({
  pathname,
  searchParams,
  topic,
  country,
  mentions,
  entity,
  following = false,
  empty,
}: {
  pathname: string;
  searchParams: Promise<SearchParams>;
  topic?: string;
  country?: string;
} & MentionProps) {
  const params = await searchParams;
  const filters = { ...parseFilters(params, topic), country, mentions, mutes: await getMutes() };
  await connection();
  let items, since;
  try {
    [items, since] = await Promise.all([getLatest(filters), getLatestArticleId(filters)]);
  } catch (err) {
    return loadError(err);
  }

  return (
    <div className="space-y-4">
      <LiveUpdates
        since={since}
        topic={filters.topic}
        region={filters.region}
        country={filters.country}
        entity={entity}
        following={following}
        mutesKey={mutesKey(filters.mutes)}
      />
      <Filters pathname={pathname} params={params} filters={filters} showHours={false} />
      {items.length === 0 ? (
        <Notice title={empty?.title ?? "No headlines yet"} body={empty?.body ?? "Run the ingest worker to pull in feeds."} />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((a) => (
            <li key={a.id} className="flex items-baseline gap-3 px-4 py-3">
              <time className="w-10 shrink-0 text-xs tabular-nums text-muted" dateTime={a.publishedAt.toISOString()}>
                {timeAgo(a.publishedAt)}
              </time>
              <div className="min-w-0">
                <a href={outboundUrl(a.url)} data-outbound="1" className="font-medium hover:underline" target="_blank" rel="noopener">
                  {a.title}
                </a>
                <p className="text-sm text-muted">
                  {a.outletName}
                  {a.storyOutletCount > 1 && ` · ${a.storyOutletCount} sources on this story`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-line bg-surface" />
      ))}
    </div>
  );
}
