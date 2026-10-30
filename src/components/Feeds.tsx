import { connection } from "next/server";
import { Filters } from "./Filters";
import { LiveUpdates } from "./LiveUpdates";
import { StoryCard } from "./StoryCard";
import { outboundUrl } from "@/lib/normalize";
import { parseFilters, timeAgo, type SearchParams } from "@/lib/filters";
import { getLatest, getLatestArticleId, getTopStories } from "@/lib/queries";
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

  return (
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
        stories.map((s) => <StoryCard key={s.id} story={s} mutedTopics={filters.mutes.topics} saved={saved.has(s.id)} />)
      )}
    </div>
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
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-surface" />
      ))}
    </div>
  );
}
