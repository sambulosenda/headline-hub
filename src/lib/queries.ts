import { and, arrayContains, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles, outlets, stories } from "@/db/schema";

export interface FeedFilters {
  topic?: string;
  /** Only stories updated in this many hours. */
  hours: number;
  region?: "uk" | "us" | "intl";
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
    .orderBy(desc(stories.score))
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
  const conditions = [eq(outlets.active, true)];
  if (filters.topic) conditions.push(arrayContains(articles.topics, [filters.topic]));
  if (filters.region) conditions.push(eq(outlets.region, filters.region));

  return db
    .select({ ...coverageSelect(), storyOutletCount: stories.outletCount })
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .innerJoin(stories, eq(stories.id, articles.storyId))
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}
