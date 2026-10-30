import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db/client";
import { stories } from "@/db/schema";
import { loadCoverage, type StoryWithCoverage } from "./queries";

/**
 * One story with all its coverage, loaded once per request (the page and its
 * metadata both need it). It was cached for a few minutes with "use cache";
 * bring that back when Cache Components work on Cloudflare (see next.config.ts).
 */
export const getStory = cache(async (id: number): Promise<StoryWithCoverage | null> => {
  const [row] = await getDb().select().from(stories).where(eq(stories.id, id)).limit(1);
  if (!row) return null;
  const coverage = await loadCoverage([id]);
  return { ...row, coverage: coverage.get(id) ?? [] };
});

/** Outlet names in coverage order, each once. */
export function outletNames(story: StoryWithCoverage): string[] {
  return [...new Set(story.coverage.map((c) => c.outletName))];
}

/** One-line summary for link previews, e.g. "Covered by BBC News, Reuters and 3 more outlets." */
export function coverageLine(names: string[], max = 3): string {
  if (names.length === 0) return "Every outlet's take, grouped on Headline Hub.";
  if (names.length === 1) return `Covered by ${names[0]}.`;
  if (names.length <= max) return `Covered by ${names.slice(0, -1).join(", ")} and ${names.at(-1)}.`;
  const rest = names.length - max;
  return `Covered by ${names.slice(0, max).join(", ")} and ${rest} more outlet${rest === 1 ? "" : "s"}.`;
}
