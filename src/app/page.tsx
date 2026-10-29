import { Suspense } from "react";
import { FeedSkeleton, TopStories } from "@/components/Feeds";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Top stories</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <TopStories pathname="/" searchParams={searchParams} />
      </Suspense>
    </>
  );
}
