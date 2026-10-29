import { describe, expect, it } from "vitest";
import { explainScore, HALF_LIFE_HOURS, storyScore } from "@/lib/ranking";

const now = new Date("2026-10-29T12:00:00Z");
const base = { outletCount: 4, avgQuality: 0.9, recentOutlets: 0, firstSeenAt: now, lastSeenAt: now };

describe("storyScore", () => {
  it("ranks broader coverage higher", () => {
    expect(storyScore({ ...base, outletCount: 10 }, now)).toBeGreaterThan(storyScore(base, now));
  });

  it("halves after one half-life", () => {
    const old = new Date(now.getTime() - HALF_LIFE_HOURS * 3_600_000);
    expect(storyScore({ ...base, lastSeenAt: old }, now)).toBeCloseTo(storyScore(base, now) / 2, 4);
  });

  it("boosts stories that are still gaining sources", () => {
    expect(storyScore({ ...base, recentOutlets: 3 }, now)).toBeGreaterThan(storyScore(base, now));
  });
});

describe("explainScore", () => {
  it("gives readable reasons", () => {
    expect(explainScore({ ...base, recentOutlets: 1 }, now)).toEqual([
      "Covered by 4 outlets",
      "Updated 0 min ago",
      "1 outlet joined in the last hour",
      "Average source quality 90%",
    ]);
  });
});
