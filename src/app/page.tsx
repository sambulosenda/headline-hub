import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FeedSkeleton, TopStories } from "@/components/Feeds";
import { NameChips } from "@/components/NameChips";
import { getTrending } from "@/lib/entities";

async function InTheNews() {
  await connection();
  const names = await getTrending(12).catch(() => []);
  if (names.length === 0) return null;
  return (
    <div className="mb-5 flex items-start gap-2">
      <Link href="/entities" className="shrink-0 pt-0.5 text-xs font-medium text-muted hover:text-accent">
        In the news
      </Link>
      <NameChips label="Names in the news" names={names} />
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Top stories</h1>
      <Suspense fallback={null}>
        <InTheNews />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <TopStories pathname="/" searchParams={searchParams} />
      </Suspense>
    </>
  );
}
