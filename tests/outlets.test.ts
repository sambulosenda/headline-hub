import { describe, expect, it } from "vitest";
import { mergeOutlets, OUTLETS, type OutletConfig } from "@/config/outlets";
import { TOPICS } from "@/config/topics";

const outlet = (id: string, url: string): OutletConfig => ({
  id,
  name: id,
  homepage: "https://example.com",
  region: "uk",
  kind: "national",
  quality: 0.8,
  feeds: [{ url, topics: ["uk"] }],
});

describe("mergeOutlets", () => {
  it("folds later sections into the first outlet with the same id", () => {
    const merged = mergeOutlets([[outlet("a", "https://a.test/1")], [outlet("b", "https://b.test/1"), { ...outlet("a", "https://a.test/2"), quality: 0.1 }]]);
    expect(merged.map((o) => o.id)).toEqual(["a", "b"]);
    expect(merged[0].feeds.map((f) => f.url)).toEqual(["https://a.test/1", "https://a.test/2"]);
    expect(merged[0].quality).toBe(0.8);
  });

  it("does not change its inputs", () => {
    const a = outlet("a", "https://a.test/1");
    mergeOutlets([[a], [outlet("a", "https://a.test/2")]]);
    expect(a.feeds).toHaveLength(1);
  });
});

describe("outlet config", () => {
  const urls = OUTLETS.flatMap((o) => o.feeds.map((f) => f.url));

  it("lists each feed once", () => {
    expect(urls.filter((u, i) => urls.indexOf(u) !== i)).toEqual([]);
  });

  it("gives each outlet a distinct name, so readers can tell sources apart", () => {
    const names = OUTLETS.map((o) => o.name);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

  it("uses known topics, sane quality and absolute feed URLs", () => {
    const topics = new Set<string>(TOPICS.map((t) => t.slug));
    for (const o of OUTLETS) {
      expect(o.quality, o.id).toBeGreaterThanOrEqual(0.5);
      expect(o.quality, o.id).toBeLessThanOrEqual(1);
      expect(o.feeds.length, o.id).toBeGreaterThan(0);
      for (const f of o.feeds) {
        expect(() => new URL(f.url), f.url).not.toThrow();
        expect(f.topics.length, f.url).toBeGreaterThan(0);
        for (const t of f.topics) expect(topics.has(t), `${f.url} ${t}`).toBe(true);
      }
    }
  });
});
