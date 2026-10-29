import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { unsubscribe } from "@/app/settings/email-actions";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false }, referrer: "no-referrer" };

async function Unsubscribe({ searchParams }: { searchParams: PageProps<"/unsubscribe">["searchParams"] }) {
  const { token, done, invalid } = await searchParams;
  const box = "rounded-xl border border-line bg-surface p-4 sm:p-5";

  if (done) {
    return (
      <div className={box} role="status">
        <h2 className="font-semibold">You&apos;re unsubscribed</h2>
        <p className="mt-1 text-sm text-muted">
          No more digests or alerts. You can turn them back on in{" "}
          <Link href="/settings" className="text-accent hover:underline">
            settings
          </Link>
          .
        </p>
      </div>
    );
  }
  if (invalid || typeof token !== "string" || token.length === 0) {
    return (
      <div className={box}>
        <h2 className="font-semibold">That unsubscribe link didn&apos;t work</h2>
        <p className="mt-1 text-sm text-muted">
          Sign in and turn emails off in{" "}
          <Link href="/settings" className="text-accent hover:underline">
            settings
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <form action={unsubscribe} className={box}>
      <input type="hidden" name="token" value={token} />
      <p className="mb-3 text-sm text-muted">Stop the daily digest and breaking-news alerts?</p>
      <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white dark:text-black">
        Unsubscribe from all emails
      </button>
    </form>
  );
}

export default function UnsubscribePage(props: PageProps<"/unsubscribe">) {
  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-2xl font-bold">Email from Headline Hub</h1>
      <Suspense fallback={<div className="h-28 animate-pulse rounded-xl border border-line bg-surface" />}>
        <Unsubscribe searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
