import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FeedSkeleton, TopStories } from "@/components/Feeds";
import { NameChips } from "@/components/NameChips";
import { resolveEntities } from "@/lib/entities";
import { getMutes } from "@/lib/mutes-server";

export const metadata: Metadata = { title: "Following", robots: { index: false } };

async function FollowingFeed({ searchParams }: PageProps<"/following">) {
  const followed = await resolveEntities((await getMutes()).follows);
  if (followed.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-8 text-center">
        <p className="font-medium">You aren&apos;t following anyone yet</p>
        <p className="mt-1 text-sm text-muted">
          Open a name on any story, or{" "}
          <Link href="/entities" className="underline underline-offset-4">
            browse people, clubs and companies
          </Link>
          , and tap Follow.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 border-b border-line pb-3">
        <NameChips label="Names you follow" names={followed} />
        <Link href="/entities" className="py-1 text-sm text-muted hover:text-foreground">
          Follow more
        </Link>
      </div>
      <TopStories
        pathname="/following"
        searchParams={searchParams}
        mentions={followed.flatMap((e) => e.terms)}
        following
        empty={{ title: "Nothing new on the names you follow", body: "Try a longer time window." }}
      />
    </>
  );
}

export default function FollowingPage(props: PageProps<"/following">) {
  return (
    <>
      <h1 className="mb-3 text-[1.75rem] leading-tight font-bold tracking-[-0.02em]">Following</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <FollowingFeed {...props} />
      </Suspense>
    </>
  );
}
