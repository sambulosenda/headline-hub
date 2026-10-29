import { OUTLETS } from "@/config/outlets";
import { TOPICS } from "@/config/topics";

/** What a reader has chosen not to see. Stored in a cookie until accounts exist. */
export interface Mutes {
  outlets: string[];
  topics: string[];
  keywords: string[];
}

export const MUTES_COOKIE = "hh_mutes";
export const MAX_KEYWORDS = 30;
const MAX_KEYWORD_LENGTH = 40;

export const NO_MUTES: Mutes = { outlets: [], topics: [], keywords: [] };

const outletIds = new Set(OUTLETS.map((o) => o.id));
const topicSlugs = new Set<string>(TOPICS.map((t) => t.slug));

export function cleanKeyword(raw: string): string | null {
  const k = raw.replace(/\s+/g, " ").trim().toLowerCase().slice(0, MAX_KEYWORD_LENGTH);
  return k.length >= 2 ? k : null;
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Parse the cookie value; anything unknown or malformed is dropped, never trusted. */
export function parseMutes(raw: string | undefined | null): Mutes {
  if (!raw) return NO_MUTES;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return NO_MUTES;
  }
  if (!data || typeof data !== "object") return NO_MUTES;
  const keywords = list(data.keywords).map(cleanKeyword).filter((k): k is string => k !== null);
  return {
    outlets: [...new Set(list(data.outlets).filter((o) => outletIds.has(o)))],
    topics: [...new Set(list(data.topics).filter((t) => topicSlugs.has(t)))],
    keywords: [...new Set(keywords)].slice(0, MAX_KEYWORDS),
  };
}

export function serializeMutes(mutes: Mutes): string {
  return JSON.stringify(mutes);
}

export function isEmpty(mutes: Mutes): boolean {
  return mutes.outlets.length + mutes.topics.length + mutes.keywords.length === 0;
}

export function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

/** Escape a keyword for a SQL ILIKE pattern. */
export function likePattern(keyword: string): string {
  return `%${keyword.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
