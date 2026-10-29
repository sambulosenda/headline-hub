export interface StoryStats {
  /** Distinct outlets covering the story. */
  outletCount: number;
  /** Mean editorial quality of those outlets, 0 to 1. */
  avgQuality: number;
  /** Outlets that joined in the last hour. */
  recentOutlets: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

/** Hours for a story's freshness to halve. */
export const HALF_LIFE_HOURS = 6;

/**
 * Transparent score: how widely a story is covered, by whom, how fresh it is,
 * and whether coverage is still growing. No click data, so clickbait gains nothing.
 */
export function storyScore(s: StoryStats, now = new Date()): number {
  const breadth = Math.log2(1 + s.outletCount);
  const ageHours = Math.max(0, (now.getTime() - s.lastSeenAt.getTime()) / 3_600_000);
  const freshness = 0.5 ** (ageHours / HALF_LIFE_HOURS);
  const velocity = 1 + 0.25 * Math.min(s.recentOutlets, 4);
  return Number((breadth * s.avgQuality * freshness * velocity).toFixed(6));
}

/** Plain-English reasons shown behind the "why is this here" button. */
export function explainScore(s: StoryStats, now = new Date()): string[] {
  const reasons = [`Covered by ${s.outletCount} outlet${s.outletCount === 1 ? "" : "s"}`];
  const ageMin = Math.round((now.getTime() - s.lastSeenAt.getTime()) / 60_000);
  reasons.push(ageMin < 60 ? `Updated ${ageMin} min ago` : `Updated ${Math.round(ageMin / 60)} h ago`);
  if (s.recentOutlets > 0) reasons.push(`${s.recentOutlets} outlet${s.recentOutlets === 1 ? "" : "s"} joined in the last hour`);
  reasons.push(`Average source quality ${Math.round(s.avgQuality * 100)}%`);
  return reasons;
}
