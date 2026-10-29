import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedSkeleton, LatestHeadlines } from "@/components/Feeds";

export const metadata: Metadata = { title: "Latest" };

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
