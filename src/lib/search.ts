import { and, desc, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles, stories } from "@/db/schema";
import type { SearchParams } from "./filters";
import { loadCoverage, type StoryWithCoverage } from "./queries";

export const WITHIN_OPTIONS = [
  { value: "1d", label: "24h", hours: 24 },
  { value: "7d", label: "7 days", hours: 24 * 7 },
  { value: "30d", label: "30 days", hours: 24 * 30 },
  { value: "all", label: "Any time", hours: undefined },
] as const;

export type Within = (typeof WITHIN_OPTIONS)[number]["value"];

export interface SearchInput {
  q: string;
  within: Within;
}

/** Longest query we pass to Postgres; anything past this is noise. */
export const MAX_QUERY_LENGTH = 200;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function parseSearch(params: SearchParams): SearchInput {
  const q = (first(params.q) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const within = first(params.within);
  return {
    q,
    within: WITHIN_OPTIONS.some((o) => o.value === within) ? (within as Within) : "7d",
  };
}

/** Search URL with `within` changed; the default drops the param. */
export function searchHref(input: SearchInput, within: Within): string {
  const qs = new URLSearchParams({ q: input.q });
  if (within !== "7d") qs.set("within", within);
  return `/search?${qs}`;
}

export interface SearchHit {
  /** Postgres ts_rank of the best-matching headline in the story. */
  rank: number;
  outletCount: number;
  lastSeenAt: Date;
}

/** Days for a search result's recency boost to halve. */
export const SEARCH_HALF_LIFE_DAYS = 3;

/**
 * Text relevance first, nudged by how widely the story was covered and how
 * recently. Recency matters less than on the front page: someone searching
 * usually wants the story, not just today's.
 */
export function searchScore(hit: SearchHit, now = new Date()): number {
  const ageDays = Math.max(0, (now.getTime() - hit.lastSeenAt.getTime()) / 86_400_000);
  const recency = 0.5 + 0.5 * 0.5 ** (ageDays / SEARCH_HALF_LIFE_DAYS);
  const breadth = 1 + Math.log2(hit.outletCount) / 4;
  return hit.rank * breadth * recency;
}

// Must match the expression behind articles_search_idx, or the index is skipped.
const document = sql`to_tsvector('english', ${articles.title} || ' ' || ${articles.summary})`;

/** Stories with at least one headline or summary matching the query, best first. */
export async function searchStories(input: SearchInput, limit = 30): Promise<StoryWithCoverage[]> {
  if (!input.q) return [];
  const db = getDb();
  const query = sql`websearch_to_tsquery('english', ${input.q})`;
  const rank = sql<number>`max(ts_rank(${document}, ${query}))`;
  const hours = WITHIN_OPTIONS.find((o) => o.value === input.within)?.hours;
  const conditions = [sql`${document} @@ ${query}`];
  if (hours) {
    const since = new Date(Date.now() - hours * 3_600_000).toISOString();
    conditions.push(gt(articles.publishedAt, sql`${since}::timestamptz`));
  }

  // Over-fetch by text rank, then blend in coverage and recency.
  const matches = await db
    .select({ storyId: articles.storyId, rank: rank.mapWith(Number) })
    .from(articles)
    .where(and(...conditions))
    .groupBy(articles.storyId)
    .orderBy(desc(rank))
    .limit(limit * 4);
  const rankByStory = new Map(matches.filter((m) => m.storyId !== null).map((m) => [m.storyId!, m.rank]));
  if (rankByStory.size === 0) return [];

  const rows = await db
    .select()
    .from(stories)
    .where(inArray(stories.id, [...rankByStory.keys()]));
  const now = new Date();
  const ranked = rows
    .map((r) => ({ row: r, score: searchScore({ ...r, rank: rankByStory.get(r.id) ?? 0 }, now) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.row);

  const coverage = await loadCoverage(ranked.map((r) => r.id));
  return ranked.map((r) => ({ ...r, coverage: coverage.get(r.id) ?? [] }));
}
