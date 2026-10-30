import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FeedSkeleton } from "@/components/Feeds";
import { StoryCard, StoryList } from "@/components/StoryCard";
import { getCurrentUser } from "@/lib/auth";
import { getSavedStories } from "@/lib/saved";

export const metadata: Metadata = { title: "Saved stories", robots: { index: false } };

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}

async function SavedList() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Notice title="Sign in to save stories">
        <Link href="/signin" className="text-accent hover:underline">
          Sign in
        </Link>{" "}
        and tap Save on any story to keep it here, on every device.
      </Notice>
    );
  }
  // Called outside the try so its prerender signal isn't swallowed.
  await connection();
  let stories;
  try {
    stories = await getSavedStories(user.id);
  } catch (err) {
    console.error(err);
    return <Notice title="Couldn't load your saved stories">Check DATABASE_URL and that migrations have run.</Notice>;
  }
  if (stories.length === 0) {
    return <Notice title="Nothing saved yet">Tap Save on any story and it&apos;ll wait for you here.</Notice>;
  }
  return (
    <StoryList>
      {stories.map((s) => (
        <StoryCard key={s.id} story={s} saved />
      ))}
    </StoryList>
  );
}

export default function SavedPage() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Saved stories</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <SavedList />
      </Suspense>
    </>
  );
}
