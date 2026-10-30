import { describe, expect, it } from "vitest";
import { coverageStrip, originCounts, outletOrigin } from "@/lib/coverage";

const now = new Date("2026-10-30T12:00:00Z");
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000);

function item(outletId: string, outletRegion: string, outletCountry: string | null, mins = 120) {
  return { id: 0, outletId, url: "", title: "", summary: "", imageUrl: null, publishedAt: minsAgo(mins), outletName: outletId, outletRegion, outletCountry };
}

describe("outletOrigin", () => {
  const zim = { countries: ["zw"], topics: ["africa"] };

  it("calls a paper from the story's country local", () => {
    expect(outletOrigin({ outletRegion: "africa", outletCountry: "zw" }, zim)).toBe("local");
  });

  it("calls another African paper regional", () => {
    expect(outletOrigin({ outletRegion: "africa", outletCountry: "za" }, zim)).toBe("regional");
  });

  it("calls a UK paper on an African story international", () => {
    expect(outletOrigin({ outletRegion: "uk", outletCountry: null }, zim)).toBe("international");
  });

  it("calls a UK paper on a UK story local", () => {
    expect(outletOrigin({ outletRegion: "uk", outletCountry: null }, { countries: [], topics: ["uk"] })).toBe("local");
  });

  it("calls everything international on a story with no home", () => {
    expect(outletOrigin({ outletRegion: "uk", outletCountry: null }, { countries: [], topics: ["tech"] })).toBe("international");
  });
});

describe("coverageStrip", () => {
  it("gives one bar per outlet, local first, and marks recent arrivals", () => {
    const bars = coverageStrip(
      {
        countries: ["zw"],
        topics: ["africa"],
        coverage: [
          item("reuters", "intl", null, 30),
          item("herald", "africa", "zw", 300),
          item("herald", "africa", "zw", 20),
          item("maverick", "africa", "za", 200),
        ],
      },
      now,
    );
    expect(bars).toEqual([
      { origin: "local", recent: false },
      { origin: "regional", recent: false },
      { origin: "international", recent: true },
    ]);
    expect(originCounts(bars)).toEqual({ local: 1, regional: 1, international: 1 });
  });
});
