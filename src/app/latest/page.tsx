import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedSkeleton, LatestHeadlines } from "@/components/Feeds";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Latest",
  description: "Every new headline from every outlet we follow, newest first.",
  path: "/latest",
});

export default function Latest({ searchParams }: PageProps<"/latest">) {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Latest headlines</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <LatestHeadlines pathname="/latest" searchParams={searchParams} />
      </Suspense>
    </>
  );
}
