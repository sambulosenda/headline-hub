import { and, arrayContains, desc, eq, gt, gte, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles, outlets, stories } from "@/db/schema";

export const DEVELOPING_FRESH_HOURS = 3;

export interface FeedFilters {
  topic?: string;
  /** Only stories updated in this many hours. */
  hours: number;
  region?: import("@/config/outlets").Region;
  /** Only stories still gaining outlets, ordered by how fast. */
  developing?: boolean;
}

export interface CoverageItem {
  id: number;
  url: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: Date;
  outletName: string;
  outletRegion: string;
}

export interface StoryWithCoverage {
  id: number;
  title: string;
  outletCount: number;
  recentOutlets: number;
  avgQuality: number;
  score: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  topics: string[];
  coverage: CoverageItem[];
}

function coverageSelect() {
  return {
    id: articles.id,
    storyId: articles.storyId,
    url: articles.url,
    title: articles.title,
    summary: articles.summary,
    imageUrl: articles.imageUrl,
    publishedAt: articles.publishedAt,
    outletName: outlets.name,
    outletRegion: outlets.region,
    quality: outlets.quality,
  };
}

/** Top stories, ranked by score, each with every outlet's version. */
export async function getTopStories(filters: FeedFilters, limit = 30): Promise<StoryWithCoverage[]> {
  const db = getDb();
  const since = new Date(Date.now() - filters.hours * 3_600_000);
  const conditions = [gt(stories.lastSeenAt, since)];
  if (filters.topic) conditions.push(arrayContains(stories.topics, [filters.topic]));
  if (filters.developing) {
    // Two or more outlets joined in the last hour, or a fresh story already
    // picked up by three outlets within three hours of first appearing.
    const freshSince = new Date(Date.now() - DEVELOPING_FRESH_HOURS * 3_600_000);
    conditions.push(
      or(
        gte(stories.recentOutlets, 2),
        and(gte(stories.outletCount, 3), gt(stories.firstSeenAt, freshSince)),
      )!,
    );
  }
  if (filters.region) {
    conditions.push(
      sql`exists (select 1 from ${articles} a join ${outlets} o on o.id = a.outlet_id
                  where a.story_id = ${stories.id} and o.region = ${filters.region})`,
    );
  }

  const rows = await db
    .select()
    .from(stories)
    .where(and(...conditions))
    .orderBy(...(filters.developing ? [desc(stories.recentOutlets), desc(stories.score)] : [desc(stories.score)]))
    .limit(limit);
  if (rows.length === 0) return [];

  const coverage = await loadCoverage(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, coverage: coverage.get(r.id) ?? [] }));
}

/** Every outlet's version of each story, best outlet first. */
export async function loadCoverage(storyIds: number[]): Promise<Map<number, CoverageItem[]>> {
  const byStory = new Map<number, CoverageItem[]>();
  if (storyIds.length === 0) return byStory;
  const coverage = await getDb()
    .select(coverageSelect())
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .where(inArray(articles.storyId, storyIds))
    .orderBy(desc(outlets.quality), articles.publishedAt);

  for (const c of coverage) {
    const list = byStory.get(c.storyId!) ?? [];
    list.push(c);
    byStory.set(c.storyId!, list);
  }
  return byStory;
}

export interface LatestItem extends CoverageItem {
  storyOutletCount: number;
}

/** Newest headlines first, regardless of clustering. */
export async function getLatest(filters: Omit<FeedFilters, "hours">, limit = 60): Promise<LatestItem[]> {
  const db = getDb();
  const conditions = scopeConditions(filters);

  return db
    .select({ ...coverageSelect(), storyOutletCount: stories.outletCount })
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .innerJoin(stories, eq(stories.id, articles.storyId))
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export type ScopeFilters = Omit<FeedFilters, "hours">;

function scopeConditions(filters: ScopeFilters) {
  const conditions = [eq(outlets.active, true)];
  if (filters.topic) conditions.push(arrayContains(articles.topics, [filters.topic]));
  if (filters.region) conditions.push(eq(outlets.region, filters.region));
  return conditions;
}

/** Newest article id in scope: the marker a page sends back to ask "what's new since I loaded?". */
export async function getLatestArticleId(filters: ScopeFilters): Promise<number> {
  const [row] = await getDb()
    .select({ id: sql<number | null>`max(${articles.id})` })
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .where(and(...scopeConditions(filters)));
  return row?.id ?? 0;
}

export interface UpdateCounts {
  /** Stories that did not exist when the page loaded. */
  newStories: number;
  /** Existing stories that gained coverage since then. */
  updatedStories: number;
  latestId: number;
}

/** What changed in scope since an article id, counted per story. */
export async function countUpdates(filters: ScopeFilters, sinceId: number): Promise<UpdateCounts> {
  const db = getDb();
  const fresh = await db
    .select({
      storyId: articles.storyId,
      maxId: sql<number>`max(${articles.id})`.mapWith(Number),
      isNew: sql<boolean>`bool_and(not exists (
        select 1 from articles old where old.story_id = ${articles.storyId} and old.id <= ${sinceId}
      ))`,
    })
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .where(and(gt(articles.id, sinceId), ...scopeConditions(filters)))
    .groupBy(articles.storyId);

  const newStories = fresh.filter((f) => f.isNew).length;
  return {
    newStories,
    updatedStories: fresh.length - newStories,
    latestId: Math.max(sinceId, ...fresh.map((f) => f.maxId)),
  };
}
