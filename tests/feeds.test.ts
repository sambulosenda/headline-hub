import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseFeed } from "@/lib/feeds";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const now = new Date("2026-10-29T12:00:00Z");

describe("parseFeed", () => {
  it("parses RSS, dedupes by canonical URL and skips bad items", async () => {
    const items = await parseFeed(fixture("sample-rss.xml"), now);
    expect(items.map((i) => i.url)).toEqual(["https://example.com/news/boe-rates", "https://example.com/news/future"]);
    expect(items[0]).toMatchObject({
      title: "Bank of England holds interest rates at 4% amid inflation worries",
      summary: "The Bank's committee voted 6–3 to keep rates on hold.",
      imageUrl: "https://example.com/img/boe.jpg",
      publishedAt: new Date("2026-10-28T12:00:00Z"),
    });
  });

  it("ignores future publish dates", async () => {
    const items = await parseFeed(fixture("sample-rss.xml"), now);
    expect(items[1].publishedAt).toBeNull();
  });

  it("parses Atom", async () => {
    const [item] = await parseFeed(fixture("sample-atom.xml"), now);
    expect(item).toMatchObject({
      url: "https://atom.example.org/sport/arsenal-spurs",
      title: "Arsenal beat Spurs 3-1 in north London derby",
      publishedAt: new Date("2026-10-28T18:30:00Z"),
    });
  });
});
