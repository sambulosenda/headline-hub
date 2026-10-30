import { connection } from "next/server";
import { Filters } from "./Filters";
import { LiveUpdates } from "./LiveUpdates";
import Link from "next/link";
import { Suspense } from "react";
import { StoryCard, StoryList } from "./StoryCard";
import { outboundUrl } from "@/lib/normalize";
import { parseFilters, timeAgo, withParam, type SearchParams } from "@/lib/filters";
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

  // "See all" links carry the feed's filters, and only exist where the target page can show the same scope.
  const region = filters.region && { region: filters.region };
  const latestHref =
    pathname === "/" ? withParam("/latest", { ...region }, "view", undefined)
    : topic || country || entity ? withParam(pathname, { ...region }, "view", "latest")
    : undefined;
  const developingHref =
    topic || country || mentions
      ? undefined
      : withParam("/developing", { ...region }, "hours", filters.hours === 24 ? undefined : String(filters.hours));

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
        <Rail filters={filters} latestHref={latestHref} developingHref={developingHref} showDeveloping={!developing} />
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
  developingHref,
  showDeveloping,
}: {
  filters: FeedFilters;
  latestHref?: string;
  developingHref?: string;
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
  const heading = "mb-1 flex items-baseline justify-between border-b-2 border-foreground pb-2.5 text-[0.9375rem] font-bold";

  return (
    <aside className="hidden space-y-6 self-start lg:sticky lg:top-32 lg:block" aria-label="More headlines">
      {developing.length > 0 && (
        <section>
          <h2 className={heading}>
            <span>Developing</span>
            {developingHref && (
              <Link href={developingHref} className="text-[0.8125rem] font-medium text-muted hover:text-foreground">
                See all
              </Link>
            )}
          </h2>
          <ul className="divide-y divide-line text-sm">
            {developing.map((s) => (
              <li key={s.id} className="py-3">
                <Link href={storyPath(s.id, s.title)} className="text-[0.9375rem] leading-snug font-semibold hover:underline">
                  {s.title}
                </Link>
                <p className="mt-0.5 text-[0.8125rem] text-subtle">
                  {s.outletCount} outlets
                  {s.recentOutlets > 0 && <span className="text-warn"> · +{s.recentOutlets} in the last hour</span>}
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
              <Link href={latestHref} className="text-[0.8125rem] font-medium text-muted hover:text-foreground">
                See all
              </Link>
            )}
          </h2>
          <ul className="divide-y divide-line text-sm">
            {latest.map((a) => (
              <li key={a.id} className="flex gap-3 py-2.5">
                <time className="w-9 shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted" dateTime={a.publishedAt.toISOString()}>
                  {timeAgo(a.publishedAt)}
                </time>
                <div className="min-w-0">
                  <a href={outboundUrl(a.url)} data-outbound="1" className="leading-snug hover:underline" target="_blank" rel="noopener">
                    {a.title}
                  </a>
                  <p className="mt-0.5 text-[0.8125rem] text-muted">{a.outletName}</p>
                </div>
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
        <ul className="divide-y divide-line">
          {items.map((a) => (
            <li key={a.id} className="flex items-baseline gap-3 py-3">
              <time className="w-10 shrink-0 font-mono text-xs tabular-nums text-muted" dateTime={a.publishedAt.toISOString()}>
                {timeAgo(a.publishedAt)}
              </time>
              <div className="min-w-0">
                <a href={outboundUrl(a.url)} data-outbound="1" className="font-medium hover:underline" target="_blank" rel="noopener">
                  {a.title}
                </a>
                <p className="text-[0.8125rem] text-subtle">
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
        <div key={i} className="h-24 animate-pulse border-b border-line" />
      ))}
    </div>
  );
}
