import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FeedSkeleton } from "@/components/Feeds";
import { SaveButton } from "@/components/SaveButton";
import { ShareButtons } from "@/components/ShareButtons";
import { findTopic } from "@/config/topics";
import { timeAgo } from "@/lib/filters";
import { outboundUrl } from "@/lib/normalize";
import { explainScore } from "@/lib/ranking";
import { savedByCurrentUser } from "@/lib/saved";
import { SITE_NAME, siteUrl } from "@/lib/site";
import { parseStoryId, storyPath } from "@/lib/slug";
import { coverageLine, getStory, outletNames } from "@/lib/story";

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

async function StoryView({ params }: PageProps<"/story/[id]">) {
  const id = parseStoryId((await params).id);
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

  const url = new URL(storyPath(story.id, story.title), siteUrl()).toString();
  const names = outletNames(story);
  const topics = story.topics.map(findTopic).filter((t) => t !== undefined);
  const developing = story.recentOutlets >= 2;

  return (
    <article>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
          {story.outletCount} {story.outletCount === 1 ? "source" : "sources"}
        </span>
        {developing && <span className="rounded-full bg-warn-soft px-2 py-0.5 font-medium text-warn">Developing</span>}
        <span>
          First seen {timeAgo(story.firstSeenAt)} ago · updated{" "}
          <time dateTime={story.lastSeenAt.toISOString()}>{timeAgo(story.lastSeenAt)} ago</time>
        </span>
      </div>
      <h1 className="text-2xl font-bold leading-tight text-balance sm:text-3xl">{story.title}</h1>
      <p className="mt-2 text-muted">{coverageLine(names)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <ShareButtons url={url} title={story.title} />
        <SaveButton storyId={story.id} saved={!!saved} />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Coverage from {names.length} {names.length === 1 ? "outlet" : "outlets"}
      </h2>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {story.coverage.map((a) => (
          <li key={a.id} className="px-4 py-3">
            <p className="text-xs text-muted">
              <span className="font-medium text-foreground">{a.outletName}</span> ·{" "}
              <time dateTime={a.publishedAt.toISOString()}>{timeAgo(a.publishedAt)}</time>
            </p>
            <a href={outboundUrl(a.url)} className="font-medium hover:underline" target="_blank" rel="noopener">
              {a.title}
            </a>
            {a.summary && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{a.summary}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold">Why this is ranked</h2>
          <ul className="list-disc pl-5 text-muted">
            {explainScore(story).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
        {topics.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold">More on</h2>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <Link key={t.slug} href={`/topic/${t.slug}`} className="rounded-md border border-line px-2.5 py-1 hover:border-accent hover:text-accent">
                  {t.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

export default function StoryPage(props: PageProps<"/story/[id]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <StoryView {...props} />
    </Suspense>
  );
}
