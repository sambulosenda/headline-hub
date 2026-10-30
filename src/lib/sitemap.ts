import { and, desc, eq, gt, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { stories, trendingNames } from "@/db/schema";

/** Stories seen this recently go in the sitemap; older ones drop out but their pages keep working. */
export const SITEMAP_DAYS = 3;
/** Single-outlet stories are thin pages, so only grouped ones are listed. */
export const SITEMAP_MIN_OUTLETS = 2;
const MAX_STORIES = 5000;

export async function getSitemapStories() {
  const since = new Date(Date.now() - SITEMAP_DAYS * 86_400_000);
  return getDb()
    .select({ id: stories.id, title: stories.title, lastSeenAt: stories.lastSeenAt })
    .from(stories)
    .where(and(gt(stories.lastSeenAt, since), gte(stories.outletCount, SITEMAP_MIN_OUTLETS)))
    .orderBy(desc(stories.lastSeenAt))
    .limit(MAX_STORIES);
}

/** Names spotted automatically in the last week (listed ones are added from config). */
export async function getSitemapNames() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  return getDb()
    .select({ slug: trendingNames.slug, lastSeenAt: trendingNames.lastSeenAt })
    .from(trendingNames)
    .where(and(eq(trendingNames.kind, "auto"), gt(trendingNames.lastSeenAt, since)))
    .limit(1000);
}
