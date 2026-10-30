import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { configSnippet, isAdmin, listSubmissions } from "@/lib/submissions";
import { approveSubmission, rejectSubmission } from "./actions";

export const metadata: Metadata = { title: "Feed submissions", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for review",
  failed_checks: "Failed checks",
  approved: "Approved",
  rejected: "Rejected",
};

async function Queue() {
  const user = await getCurrentUser();
  // Hide the page entirely from everyone but reviewers.
  if (!isAdmin(user?.email)) notFound();
  await connection();
  const submissions = await listSubmissions();
  if (submissions.length === 0) return <p className="text-sm text-muted">No submissions yet.</p>;

  return (
    <div className="space-y-4">
      {submissions.map((s) => (
        <article key={s.id} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">{s.outletName}</h2>
            <span className={`text-xs ${s.status === "pending" ? "text-accent" : "text-muted"}`}>
              {STATUS_LABEL[s.status] ?? s.status} · {s.createdAt.toISOString().slice(0, 10)}
            </span>
          </div>
          <p className="mt-1 break-all text-sm">
            <a href={s.homepage} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
              {s.homepage}
            </a>
            <br />
            Feed: <span className="text-muted">{s.feedUrl}</span>
            <br />
            From: <span className="text-muted">{s.contactEmail}</span> · {s.region} · {s.topics.join(", ")}
          </p>
          {s.notes && <p className="mt-2 text-sm italic text-muted">“{s.notes}”</p>}
          <ul className="mt-3 space-y-0.5 text-sm">
            {s.vetting.checks.map((c) => (
              <li key={c.name}>
                {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✗"} {c.name}:{" "}
                <span className="text-muted">{c.detail}</span>
              </li>
            ))}
          </ul>
          {s.vetting.sampleTitles.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-muted">Latest headlines</summary>
              <ul className="mt-1 list-disc pl-5">
                {s.vetting.sampleTitles.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </details>
          )}
          {s.status === "approved" ? (
            <details className="mt-3 text-sm" open>
              <summary className="cursor-pointer text-muted">Add to src/config/outlets.ts</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 text-xs">{configSnippet(s)}</pre>
            </details>
          ) : (
            s.status !== "rejected" && (
              <div className="mt-3 flex gap-2">
                <form action={approveSubmission.bind(null, s.id)}>
                  <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white dark:text-black">
                    Approve
                  </button>
                </form>
                <form action={rejectSubmission.bind(null, s.id)}>
                  <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent">
                    Reject
                  </button>
                </form>
              </div>
            )
          )}
        </article>
      ))}
    </div>
  );
}

export default function SubmissionsPage() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Feed submissions</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl border border-line bg-surface" />}>
        <Queue />
      </Suspense>
    </>
  );
}
