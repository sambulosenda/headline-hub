import { connection } from "next/server";
import { Filters } from "./Filters";
import { LiveUpdates } from "./LiveUpdates";
import { StoryCard } from "./StoryCard";
import { outboundUrl } from "@/lib/normalize";
import { parseFilters, timeAgo, type SearchParams } from "@/lib/filters";
import { getLatest, getLatestArticleId, getTopStories } from "@/lib/queries";

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
}: {
  pathname: string;
  searchParams: Promise<SearchParams>;
  topic?: string;
}) {
  const params = await searchParams;
  const filters = parseFilters(params, topic);
  // News must be fresh per request, never baked into the prerendered shell.
  // Called outside the try so its prerender signal isn't swallowed.
  await connection();
  let stories, since;
  try {
    [stories, since] = await Promise.all([
      getTopStories(filters).then((all) => all.filter((s) => s.coverage.length > 0)),
      getLatestArticleId(filters),
    ]);
  } catch (err) {
    return loadError(err);
  }

  return (
    <div className="space-y-4">
      <LiveUpdates since={since} topic={filters.topic} region={filters.region} />
      <Filters pathname={pathname} params={params} filters={filters} />
      {stories.length === 0 ? (
        <Notice title="No stories yet" body="Try a longer time window, or run the ingest worker." />
      ) : (
        stories.map((s) => <StoryCard key={s.id} story={s} />)
      )}
    </div>
  );
}

export async function LatestHeadlines({
  pathname,
  searchParams,
  topic,
}: {
  pathname: string;
  searchParams: Promise<SearchParams>;
  topic?: string;
}) {
  const params = await searchParams;
  const filters = parseFilters(params, topic);
  await connection();
  let items, since;
  try {
    [items, since] = await Promise.all([getLatest(filters), getLatestArticleId(filters)]);
  } catch (err) {
    return loadError(err);
  }

  return (
    <div className="space-y-4">
      <LiveUpdates since={since} topic={filters.topic} region={filters.region} />
      <Filters pathname={pathname} params={params} filters={filters} showHours={false} />
      {items.length === 0 ? (
        <Notice title="No headlines yet" body="Run the ingest worker to pull in feeds." />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((a) => (
            <li key={a.id} className="flex items-baseline gap-3 px-4 py-3">
              <time className="w-10 shrink-0 text-xs tabular-nums text-muted" dateTime={a.publishedAt.toISOString()}>
                {timeAgo(a.publishedAt)}
              </time>
              <div className="min-w-0">
                <a href={outboundUrl(a.url)} className="font-medium hover:underline" target="_blank" rel="noopener">
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
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-surface" />
      ))}
    </div>
  );
}
