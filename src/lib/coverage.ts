import type { StoryWithCoverage } from "./queries";

/** Where an outlet sits relative to the story it covers. */
export type Origin = "local" | "regional" | "international";

export interface StripBar {
  origin: Origin;
  /** The outlet's first article on this story arrived in the last hour. */
  recent: boolean;
}

const ORDER: Origin[] = ["local", "regional", "international"];
const HOUR = 3_600_000;

/**
 * Local: the outlet's home country is one the story is about, or a UK outlet on a UK story.
 * Regional: an African outlet on a story about another African country (our country pages are all African).
 * International: everyone else.
 */
export function outletOrigin(
  outlet: { outletCountry: string | null; outletRegion: string },
  story: Pick<StoryWithCoverage, "countries" | "topics">,
): Origin {
  if (story.countries.length > 0) {
    if (outlet.outletCountry && story.countries.includes(outlet.outletCountry)) return "local";
    return outlet.outletRegion === "africa" ? "regional" : "international";
  }
  if (story.topics.includes("uk") && outlet.outletRegion === "uk") return "local";
  return "international";
}

/** One bar per outlet, local first, for the coverage strip on story rows. */
export function coverageStrip(
  story: Pick<StoryWithCoverage, "countries" | "topics" | "coverage">,
  now = new Date(),
): StripBar[] {
  const first = new Map<string, StoryWithCoverage["coverage"][number]>();
  for (const c of story.coverage) {
    const seen = first.get(c.outletId);
    if (!seen || c.publishedAt < seen.publishedAt) first.set(c.outletId, c);
  }
  return [...first.values()]
    .map((c) => ({ origin: outletOrigin(c, story), recent: now.getTime() - c.publishedAt.getTime() < HOUR }))
    .sort((a, b) => ORDER.indexOf(a.origin) - ORDER.indexOf(b.origin));
}

/** Counts by origin, for labels that must not rely on colour alone. */
export function originCounts(bars: StripBar[]): Record<Origin, number> {
  const counts: Record<Origin, number> = { local: 0, regional: 0, international: 0 };
  for (const b of bars) counts[b.origin]++;
  return counts;
}

type CoverageItem = StoryWithCoverage["coverage"][number];

export interface TimelineEntry {
  item: CoverageItem;
  origin: Origin;
  /** Later outlets that ran the same headline word for word, folded into this entry. */
  copies: CoverageItem[];
}

const headlineKey = (title: string) => title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Every outlet's version in the order it appeared, with word-for-word repeats folded into the first. */
export function coverageTimeline(story: Pick<StoryWithCoverage, "countries" | "topics" | "coverage">): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const byHeadline = new Map<string, TimelineEntry>();
  const sorted = [...story.coverage].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  for (const item of sorted) {
    const key = headlineKey(item.title);
    const first = byHeadline.get(key);
    if (first) {
      first.copies.push(item);
      continue;
    }
    const entry = { item, origin: outletOrigin(item, story), copies: [] };
    byHeadline.set(key, entry);
    entries.push(entry);
  }
  return entries;
}

/**
 * Splits a country's stories into those its own newsrooms are covering and those only
 * outlets elsewhere have picked up, keeping the ranking within each.
 */
export function splitByLocalCoverage<S extends Pick<StoryWithCoverage, "coverage">>(
  stories: S[],
  country: string,
): { local: S[]; abroad: S[] } {
  const local: S[] = [];
  const abroad: S[] = [];
  for (const s of stories) (s.coverage.some((c) => c.outletCountry === country) ? local : abroad).push(s);
  return { local, abroad };
}
