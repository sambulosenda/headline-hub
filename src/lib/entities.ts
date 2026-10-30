import { desc, gt, lt, sql } from "drizzle-orm";
import { cache } from "react";
import { findEntity, type EntityKind } from "@/config/entities";
import { getDb } from "@/db/client";
import { articles, trendingNames } from "@/db/schema";
import { countNames, TRENDING_HOURS } from "./names";

type Db = ReturnType<typeof getDb>;

/** A page-able name: a listed entity, or one spotted in headlines. */
export interface EntityRef {
  slug: string;
  name: string;
  kind: EntityKind | "auto";
  terms: string[];
}

/** Spotted names keep their page this long after outlets stop using them. */
const KEEP_DAYS = 30;
/** A name is "in the news now" if the last refresh still counted it. */
const CURRENT_MINUTES = 30;
const SLUG = /^[a-z0-9-]{1,80}$/;

/** Recounts names over the last day of headlines. Run by the ingest worker. */
export async function refreshTrendingNames(db: Db, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - TRENDING_HOURS * 3_600_000).toISOString();
  const headlines = await db
    .select({ title: articles.title, outletId: articles.outletId })
    .from(articles)
    .where(sql`${articles.publishedAt} > ${since}::timestamptz`);
  const counts = countNames(headlines);
  if (counts.length > 0) {
    await db
      .insert(trendingNames)
      .values(counts.map((c) => ({ ...c, lastSeenAt: now })))
      .onConflictDoUpdate({
        target: trendingNames.slug,
        set: {
          name: sql`excluded.name`,
          kind: sql`excluded.kind`,
          outlets: sql`excluded.outlets`,
          articles: sql`excluded.articles`,
          lastSeenAt: sql`excluded.last_seen_at`,
        },
      });
  }
  await db.delete(trendingNames).where(lt(trendingNames.lastSeenAt, new Date(now.getTime() - KEEP_DAYS * 86_400_000)));
  return counts.length;
}

/** Names the most outlets are using right now, listed and spotted alike. */
export const getTrending = cache(async (limit = 40) => {
  const fresh = new Date(Date.now() - CURRENT_MINUTES * 60_000);
  return getDb()
    .select()
    .from(trendingNames)
    .where(gt(trendingNames.lastSeenAt, fresh))
    .orderBy(desc(trendingNames.outlets), desc(trendingNames.articles), trendingNames.name)
    .limit(limit);
});

/** The listed entity with this slug, or a name spotted in the last month. */
export const resolveEntity = cache(async (slug: string): Promise<EntityRef | null> => {
  const listed = findEntity(slug);
  if (listed) return listed;
  if (!SLUG.test(slug)) return null;
  const [row] = await getDb()
    .select({ slug: trendingNames.slug, name: trendingNames.name })
    .from(trendingNames)
    .where(sql`${trendingNames.slug} = ${slug} and ${trendingNames.kind} = 'auto'`);
  return row ? { slug: row.slug, name: row.name, kind: "auto", terms: [row.name] } : null;
});

/** Followed slugs that still resolve, in the order they were followed. */
export async function resolveEntities(slugs: string[]): Promise<EntityRef[]> {
  const resolved = await Promise.all(slugs.map((s) => resolveEntity(s)));
  return resolved.filter((e): e is EntityRef => e !== null);
}
