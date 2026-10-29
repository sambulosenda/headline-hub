"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { UpdateCounts } from "@/lib/queries";

function label({ newStories, updatedStories }: UpdateCounts) {
  const parts = [];
  if (newStories > 0) parts.push(`${newStories} new ${newStories === 1 ? "story" : "stories"}`);
  if (updatedStories > 0) parts.push(`${updatedStories} updated`);
  return parts.join(" · ");
}

/** Listens for new coverage since this render and offers a one-tap refresh. */
export function LiveUpdates({ since, topic, region }: { since: number; topic?: string; region?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const params = new URLSearchParams({ since: String(since) });
  if (topic) params.set("topic", topic);
  if (region) params.set("region", region);
  const query = params.toString();
  // Counts are tagged with the query they answer, so a stale count never shows after a refresh.
  const [latest, setLatest] = useState<{ query: string; counts: UpdateCounts } | null>(null);
  const counts = latest?.query === query ? latest.counts : null;

  useEffect(() => {
    const source = new EventSource(`/api/updates?${query}`);
    source.addEventListener("updates", (e) =>
      setLatest({ query, counts: JSON.parse((e as MessageEvent<string>).data) }),
    );
    return () => source.close();
  }, [query]);

  const text = counts ? label(counts) : "";
  return (
    <div aria-live="polite" className="sticky top-28 z-10 flex h-0 items-start justify-center">
      {text && (
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white shadow-md transition hover:opacity-90 disabled:opacity-60 dark:text-black"
        >
          {pending ? "Updating…" : `↑ ${text}`}
        </button>
      )}
    </div>
  );
}
