import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { CONTACT_REASONS } from "@/config/contact";
import { listContactMessages } from "@/lib/contact";
import { isAdmin } from "@/lib/submissions";
import { markDone, reopen } from "./actions";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

const REASON_LABEL = Object.fromEntries(CONTACT_REASONS.map((r) => [r.value, r.label]));

async function Inbox() {
  const user = await getCurrentUser();
  // Hide the page entirely from everyone but reviewers.
  if (!isAdmin(user?.email)) notFound();
  await connection();
  const messages = await listContactMessages();
  if (messages.length === 0) return <p className="text-sm text-muted">No messages yet.</p>;

  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <article key={m.id} className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${m.status === "done" ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className={`font-semibold ${m.reason === "takedown" && m.status === "open" ? "text-warn" : ""}`}>
              {REASON_LABEL[m.reason] ?? m.reason}
            </h2>
            <span className="text-xs text-muted">
              {m.status === "done" ? "Done" : "Open"} · {m.createdAt.toISOString().slice(0, 16).replace("T", " ")}
            </span>
          </div>
          <p className="mt-1 break-all text-sm">
            From: {m.name} &lt;
            <a href={`mailto:${m.email}`} className="text-accent hover:underline">
              {m.email}
            </a>
            &gt;{m.organisation && <span className="text-muted"> · {m.organisation}</span>}
            {m.url && (
              <>
                <br />
                <a href={m.url} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                  {m.url}
                </a>
              </>
            )}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
          <form action={(m.status === "done" ? reopen : markDone).bind(null, m.id)} className="mt-3">
            <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent">
              {m.status === "done" ? "Reopen" : "Mark done"}
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Messages</h1>
        <span className="flex gap-4 text-sm">
          <Link href="/admin/submissions" className="text-accent hover:underline">
            Feed submissions
          </Link>
          <Link href="/admin/analytics" className="text-accent hover:underline">
            Analytics
          </Link>
        </span>
      </div>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl border border-line bg-surface" />}>
        <Inbox />
      </Suspense>
    </>
  );
}
