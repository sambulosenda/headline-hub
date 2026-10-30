import { describe, expect, it } from "vitest";
import { coverageStrip, coverageTimeline, originCounts, outletOrigin, splitByLocalCoverage, storyImage } from "@/lib/coverage";

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

describe("coverageTimeline", () => {
  it("orders by time and folds word-for-word repeats into the first", () => {
    const a = { ...item("herald", "africa", "zw", 300), title: "ZERA announces new fuel prices" };
    const b = { ...item("zbc", "africa", "zw", 280), title: "ZERA announces new fuel prices." };
    const c = { ...item("reuters", "intl", null, 100), title: "Zimbabwe raises fuel prices" };
    const entries = coverageTimeline({ countries: ["zw"], topics: [], coverage: [c, b, a] });
    expect(entries.map((e) => e.item.outletId)).toEqual(["herald", "reuters"]);
    expect(entries[0].copies.map((x) => x.outletId)).toEqual(["zbc"]);
    expect(entries[1].origin).toBe("international");
  });
});

describe("splitByLocalCoverage", () => {
  it("puts stories a local outlet covers first and keeps their order", () => {
    const a = { id: 1, coverage: [item("bbc", "uk", "gb"), item("herald", "africa", "zw")] };
    const b = { id: 2, coverage: [item("reuters", "world", null)] };
    const c = { id: 3, coverage: [item("newsday", "africa", "zw")] };
    const { local, abroad } = splitByLocalCoverage([a, b, c], "zw");
    expect(local.map((s) => s.id)).toEqual([1, 3]);
    expect(abroad.map((s) => s.id)).toEqual([2]);
  });
});

describe("storyImage", () => {
  it("takes the first https image and credits its outlet", () => {
    const withImage = (id: string, imageUrl: string | null) => ({ ...item(id, "uk", null), imageUrl });
    const story = { coverage: [withImage("a", null), withImage("b", "http://x/1.jpg"), withImage("c", "https://x/2.jpg")] };
    expect(storyImage(story)).toMatchObject({ src: "https://x/2.jpg", credit: "c" });
    expect(storyImage({ coverage: [withImage("a", null)] })).toBeNull();
  });
});
