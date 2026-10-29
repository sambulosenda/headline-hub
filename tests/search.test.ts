import { describe, expect, it } from "vitest";
import { MAX_QUERY_LENGTH, parseSearch, searchHref, searchScore } from "@/lib/search";
import { coverageLine } from "@/lib/story";

const now = new Date("2026-10-29T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe("parseSearch", () => {
  it("tidies the query and defaults to 7 days", () => {
    expect(parseSearch({ q: "  interest   rates " })).toEqual({ q: "interest rates", within: "7d" });
  });

  it("accepts known windows only", () => {
    expect(parseSearch({ q: "x", within: "all" }).within).toBe("all");
    expect(parseSearch({ q: "x", within: "1y" }).within).toBe("7d");
  });

  it("caps very long queries", () => {
    expect(parseSearch({ q: "a".repeat(1000) }).q).toHaveLength(MAX_QUERY_LENGTH);
  });

  it("handles a missing or repeated q", () => {
    expect(parseSearch({}).q).toBe("");
    expect(parseSearch({ q: ["first", "second"] }).q).toBe("first");
  });
});

describe("searchHref", () => {
  it("drops the default window", () => {
    expect(searchHref({ q: "nhs strike", within: "30d" }, "7d")).toBe("/search?q=nhs+strike");
    expect(searchHref({ q: "nhs strike", within: "7d" }, "all")).toBe("/search?q=nhs+strike&within=all");
  });
});

describe("searchScore", () => {
  const hit = { rank: 0.1, outletCount: 3, lastSeenAt: now };

  it("prefers better text matches", () => {
    expect(searchScore({ ...hit, rank: 0.2 }, now)).toBeGreaterThan(searchScore(hit, now));
  });

  it("prefers wider coverage", () => {
    expect(searchScore({ ...hit, outletCount: 12 }, now)).toBeGreaterThan(searchScore(hit, now));
  });

  it("lets old stories fade but never vanish", () => {
    const old = searchScore({ ...hit, lastSeenAt: daysAgo(60) }, now);
    expect(old).toBeLessThan(searchScore(hit, now));
    expect(old).toBeGreaterThan(searchScore(hit, now) / 2 - 1e-9);
  });

  it("lets a much better match beat a fresher one", () => {
    expect(searchScore({ ...hit, rank: 0.3, lastSeenAt: daysAgo(10) }, now)).toBeGreaterThan(searchScore(hit, now));
  });
});

describe("coverageLine", () => {
  it("reads naturally at each size", () => {
    expect(coverageLine([])).toMatch(/Headline Hub/);
    expect(coverageLine(["BBC News"])).toBe("Covered by BBC News.");
    expect(coverageLine(["BBC News", "Reuters"])).toBe("Covered by BBC News and Reuters.");
    expect(coverageLine(["A", "B", "C"])).toBe("Covered by A, B and C.");
    expect(coverageLine(["A", "B", "C", "D"])).toBe("Covered by A, B, C and 1 more outlet.");
    expect(coverageLine(["A", "B", "C", "D", "E"])).toBe("Covered by A, B, C and 2 more outlets.");
  });
});
