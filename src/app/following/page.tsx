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
          <Link href="/entities" className="text-accent hover:underline">
            browse people, clubs and companies
          </Link>
          , and tap Follow.
        </p>
      </div>
    );
  }
  return (
    <>
      <NameChips className="mb-4" label="Names you follow" names={followed} />
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
      <h1 className="mb-4 text-2xl font-bold">Following</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <FollowingFeed {...props} />
      </Suspense>
    </>
  );
}
