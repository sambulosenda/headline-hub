import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FeedHeader } from "@/components/FeedHeader";
import { CountryChips } from "@/components/CountryChips";
import { FeedSkeleton, LatestHeadlines, TopStories } from "@/components/Feeds";
import { TOPICS, findTopic } from "@/config/topics";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/topic/[slug]">): Promise<Metadata> {
  const topic = findTopic((await params).slug);
  if (!topic) return { title: "Topic" };
  return pageMetadata({
    title: `${topic.name} news`,
    description: `Today's ${topic.name} stories from every outlet, grouped so you can see who is covering what.`,
    path: `/topic/${topic.slug}`,
    ownCard: true,
  });
}

async function TopicFeed({ params, searchParams }: PageProps<"/topic/[slug]">) {
  const topic = findTopic((await params).slug);
  if (!topic) notFound();
  const view = (await searchParams).view === "latest" ? "latest" : "top";
  const pathname = `/topic/${topic.slug}`;

  return (
    <>
      <FeedHeader title={topic.name} pathname={pathname} view={view}>
        {topic.slug === "africa" && (
          <div className="mt-1">
            <CountryChips />
          </div>
        )}
      </FeedHeader>
      {view === "latest" ? (
        <LatestHeadlines pathname={pathname} searchParams={searchParams} topic={topic.slug} />
      ) : (
        <TopStories pathname={pathname} searchParams={searchParams} topic={topic.slug} />
      )}
    </>
  );
}

export default function TopicPage(props: PageProps<"/topic/[slug]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <TopicFeed {...props} />
    </Suspense>
  );
}
