import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { confirmSignIn } from "@/app/signin/actions";

// The token is in this URL, so keep it out of Referer headers and search indexes.
export const metadata: Metadata = { title: "Confirm sign in", robots: { index: false }, referrer: "no-referrer" };

async function Confirm({ searchParams }: { searchParams: PageProps<"/auth/verify">["searchParams"] }) {
  const { token, expired } = await searchParams;

  if (expired || typeof token !== "string" || token.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-semibold">That link has expired</h2>
        <p className="mt-1 text-sm text-muted">Sign-in links work once, for 15 minutes.</p>
        <Link href="/signin" className="mt-3 inline-block text-sm text-accent hover:underline">
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <form action={confirmSignIn} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <input type="hidden" name="token" value={token} />
      <p className="mb-3 text-sm text-muted">Finish signing in on this device.</p>
      <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white dark:text-black">
        Confirm sign in
      </button>
    </form>
  );
}

export default function VerifyPage(props: PageProps<"/auth/verify">) {
  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-2xl font-bold">Sign in</h1>
      <Suspense fallback={<div className="h-28 animate-pulse rounded-xl border border-line bg-surface" />}>
        <Confirm searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
