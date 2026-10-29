import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedSkeleton, TopStories } from "@/components/Feeds";

export const metadata: Metadata = {
  title: "Developing",
  description: "Stories other outlets are picking up right now.",
};

export default function Developing({ searchParams }: PageProps<"/developing">) {
  return (
    <>
      <h1 className="text-2xl font-bold">Developing</h1>
      <p className="mb-4 mt-1 text-sm text-muted">Stories other outlets are still picking up, fastest-growing first.</p>
      <Suspense fallback={<FeedSkeleton />}>
        <TopStories pathname="/developing" searchParams={searchParams} developing />
      </Suspense>
    </>
  );
}
