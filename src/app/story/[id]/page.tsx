import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FeedSkeleton } from "@/components/Feeds";
import { SaveButton } from "@/components/SaveButton";
import { StoryImage } from "@/components/StoryImage";
import { ShareButtons } from "@/components/ShareButtons";
import { findTopic } from "@/config/topics";
import { timeAgo } from "@/lib/filters";
import { outboundUrl } from "@/lib/normalize";
import { explainScore } from "@/lib/ranking";
import { savedByCurrentUser } from "@/lib/saved";
import { SITE_NAME, siteUrl } from "@/lib/site";
import { parseStoryId, storyPath } from "@/lib/slug";
import { coverageLine, getStory, outletNames } from "@/lib/story";
import { COUNTRIES } from "@/config/countries";
import { coverageStrip, coverageTimeline, originCounts, storyImage, type Origin } from "@/lib/coverage";
import { entitiesIn } from "@/lib/names";

export async function generateMetadata({ params }: PageProps<"/story/[id]">): Promise<Metadata> {
  // Read params outside the try so its prerender signal isn't swallowed.
  const id = parseStoryId((await params).id);
  let story;
  try {
    story = id ? await getStory(id) : null;
  } catch (err) {
    console.error(err);
    return { title: "Story" };
  }
  // Throwing here, before anything streams, lets link-preview bots see a real 404.
  if (!story) notFound();

  const path = storyPath(story.id, story.title);
  const description = coverageLine(outletNames(story));
  return {
    title: story.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      siteName: SITE_NAME,
      title: story.title,
      description,
      publishedTime: story.firstSeenAt.toISOString(),
      modifiedTime: story.lastSeenAt.toISOString(),
    },
    twitter: { card: "summary_large_image", title: story.title, description },
  };
}

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "local", label: "Local" },
  { value: "regional", label: "Regional" },
  { value: "international", label: "International" },
] as const;

const ORIGIN_COLOUR: Record<Origin, string> = {
  local: "bg-accent",
  regional: "bg-cov-regional",
  international: "bg-cov-international",
};

const sectionHeading = "border-b-2 border-foreground pb-2.5 text-[0.9375rem] font-bold";

async function StoryView({ params, searchParams }: PageProps<"/story/[id]">) {
  const id = parseStoryId((await params).id);
  const fromParam = (await searchParams).from;
  const from = FILTERS.find((f) => f.value && f.value === fromParam)?.value;
  // Relative times are per request; the story data itself stays cached.
  await connection();
  let story, saved;
  try {
    story = id ? await getStory(id) : null;
    saved = story ? (await savedByCurrentUser([story.id])).has(story.id) : false;
  } catch (err) {
    console.error(err);
    return (
      <div className="rounded-xl border border-dashed border-line p-8 text-center">
        <p className="font-medium">Couldn&apos;t load this story</p>
        <p className="mt-1 text-sm text-muted">Check DATABASE_URL and that the ingest worker has run.</p>
      </div>
    );
  }
  if (!story || story.coverage.length === 0) notFound();

  const path = storyPath(story.id, story.title);
  const url = new URL(path, siteUrl()).toString();
  const names = outletNames(story);
  const topics = story.topics.map(findTopic).filter((t) => t !== undefined);
  const country = COUNTRIES.find((c) => story.countries.includes(c.code));
  const developing = story.recentOutlets >= 2;
  const timeline = coverageTimeline(story);
  const first = timeline[0].item;
  const bars = coverageStrip(story);
  const counts = originCounts(bars);
  const originLabel: Record<Origin, string> = {
    local: country ? `From ${country.name}` : "From the UK",
    regional: "Same region",
    international: "International",
  };
  const summary = story.coverage.find((c) => c.summary)?.summary;
  const image = storyImage(story);
  const shown = from ? timeline.filter((e) => e.origin === from) : timeline;
  const people = entitiesIn(story.title, 6);

  return (
    <div data-wide>
      <header className="border-b border-line pb-7">
        <p className="flex flex-wrap gap-2 text-[0.8125rem] text-muted">
          {country ? (
            <>
              <Link href="/topic/africa" className="text-subtle hover:text-foreground">
                Africa
              </Link>
              <span aria-hidden>/</span>
              <Link href={`/country/${country.code}`} className="text-subtle hover:text-foreground">
                {country.name}
              </Link>
            </>
          ) : (
            topics[0] && (
              <Link href={`/topic/${topics[0].slug}`} className="text-subtle hover:text-foreground">
                {topics[0].name}
              </Link>
            )
          )}
          {developing && <span className="ml-2 font-semibold text-warn">Developing</span>}
        </p>
        <div className={image ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,36%)] lg:grid-rows-[auto_1fr] lg:gap-x-10" : undefined}>
          <div className="lg:col-start-1">
            <h1 className="mt-3 max-w-[22ch] text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-balance sm:text-[2.5rem] sm:leading-[1.06]">
              {story.title}
            </h1>
            {summary && <p className="mt-3 max-w-[62ch] text-[1.0625rem] text-subtle">{summary}</p>}
          </div>
          {image && <StoryImage {...image} priority className="mt-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-3" />}
          <div className="lg:col-start-1">
            <p className="mt-4 flex flex-wrap gap-x-7 gap-y-1 text-[0.875rem] text-subtle">
              <span>
                First reported <b className="font-semibold text-foreground">{timeAgo(first.publishedAt)} ago</b> by {first.outletName}
              </span>
              <span>
                <b className="font-semibold text-foreground">
                  {names.length} {names.length === 1 ? "outlet" : "outlets"}
                </b>
                {names.length > 1 &&
                  (timeline.length === 1 ? ", all with the same headline" : `, ${timeline.length} different headlines`)}
              </span>
              {story.recentOutlets > 0 && (
                <span className="text-warn">
                  <b className="font-semibold">{story.recentOutlets} joined</b> in the last hour
                </span>
              )}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <ShareButtons url={url} title={story.title} />
              <SaveButton storyId={story.id} saved={!!saved} />
            </div>
          </div>
        </div>
      </header>

      <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
        <section aria-labelledby="coverage">
          <h2 id="coverage" className={sectionHeading}>
            Coverage
          </h2>
          {/* One bar for the whole split, drawn to scale; the legend repeats it in words. */}
          <div className="mt-4 flex h-2 gap-0.5" aria-hidden>
            {(["local", "regional", "international"] as const).map(
              (o) => counts[o] > 0 && <i key={o} className={ORIGIN_COLOUR[o]} style={{ flex: counts[o] }} />,
            )}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-subtle">
            {(["local", "regional", "international"] as const).map((o) => (
              <span key={o} className="inline-flex items-center gap-1.5">
                <i className={`size-2 ${ORIGIN_COLOUR[o]}`} aria-hidden />
                {originLabel[o]} {counts[o]}
              </span>
            ))}
          </p>
          <nav className="mt-5 flex gap-4 overflow-x-auto text-sm [scrollbar-width:none]" aria-label="Filter coverage">
            {FILTERS.map((f) => (
              <Link
                key={f.label}
                href={f.value ? `${path}?from=${f.value}` : path}
                scroll={false}
                aria-current={from === f.value ? "true" : undefined}
                className={`flex min-h-9 shrink-0 items-center ${from === f.value ? "font-semibold text-foreground" : "text-muted hover:text-foreground"}`}
              >
                {f.value ? originLabel[f.value] : f.label}
              </Link>
            ))}
          </nav>
          {shown.length === 0 ? (
            <p className="py-6 text-sm text-muted">No outlets in this group yet.</p>
          ) : (
            <ol className="divide-y divide-line border-t border-line">
              {shown.map(({ item: a, origin, copies }) => (
                <li key={a.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-3.5 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
                  <time className="pt-0.5 font-mono text-xs tabular-nums text-muted" dateTime={a.publishedAt.toISOString()}>
                    {timeAgo(a.publishedAt)}
                  </time>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem]">
                      <span className="font-semibold">{a.outletName}</span>
                      <span className={origin === "local" ? "text-accent" : "text-muted"}>{originLabel[origin]}</span>
                    </p>
                    <a
                      href={outboundUrl(a.url)}
                      data-outbound="1"
                      className="mt-0.5 block text-base leading-snug font-semibold hover:underline"
                      target="_blank"
                      rel="noopener"
                    >
                      {a.title}
                    </a>
                    {a.summary && <p className="mt-0.5 line-clamp-2 text-sm text-subtle">{a.summary}</p>}
                    {copies.length > 0 && (
                      <p className="mt-1.5 text-[0.8125rem] text-muted">
                        Same headline from{" "}
                        {copies.map((c, i) => (
                          <span key={c.id}>
                            {i > 0 && (i === copies.length - 1 ? " and " : ", ")}
                            <a href={outboundUrl(c.url)} data-outbound="1" className="underline-offset-2 hover:underline" target="_blank" rel="noopener">
                              {c.outletName}
                            </a>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="space-y-9 text-sm">
          {people.length > 0 && (
            <section>
              <h2 className={sectionHeading}>Names in this story</h2>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {people.map((n) => (
                  <li key={n.slug}>
                    <Link href={`/entity/${n.slug}`} className="border-b border-line-strong hover:border-foreground">
                      {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className={sectionHeading}>Why it ranks here</h2>
            <ul className="divide-y divide-line text-subtle">
              {explainScore(story).map((reason) => (
                <li key={reason} className="py-2.5">
                  {reason}
                </li>
              ))}
            </ul>
          </section>
          {topics.length > 0 && (
            <section>
              <h2 className={sectionHeading}>More on</h2>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {country && (
                  <li>
                    <Link href={`/country/${country.code}`} className="border-b border-line-strong hover:border-foreground">
                      {country.name}
                    </Link>
                  </li>
                )}
                {topics.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/topic/${t.slug}`} className="border-b border-line-strong hover:border-foreground">
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function StoryPage(props: PageProps<"/story/[id]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <StoryView {...props} />
    </Suspense>
  );
}
