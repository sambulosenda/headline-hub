import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CountryChips } from "@/components/CountryChips";
import { FeedSkeleton, LatestHeadlines, TopStories } from "@/components/Feeds";
import { TOPICS, findTopic } from "@/config/topics";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/topic/[slug]">): Promise<Metadata> {
  const topic = findTopic((await params).slug);
  return { title: topic ? `${topic.name} news` : "Topic" };
}

async function TopicFeed({ params, searchParams }: PageProps<"/topic/[slug]">) {
  const topic = findTopic((await params).slug);
  if (!topic) notFound();
  const view = (await searchParams).view === "latest" ? "latest" : "top";
  const pathname = `/topic/${topic.slug}`;
  const tab = (active: boolean) =>
    `border-b-2 pb-1 ${active ? "border-accent text-foreground" : "border-transparent text-muted"}`;

  return (
    <>
      <h1 className="mb-3 text-2xl font-bold">{topic.name}</h1>
      {topic.slug === "africa" && <CountryChips />}
      <nav className="mb-4 flex gap-4 text-sm" aria-label="View">
        <Link href={pathname} className={tab(view === "top")}>
          Top
        </Link>
        <Link href={`${pathname}?view=latest`} className={tab(view === "latest")}>
          Latest
        </Link>
      </nav>
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
