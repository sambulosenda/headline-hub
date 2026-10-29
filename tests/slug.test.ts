import { describe, expect, it } from "vitest";
import { parseStoryId, slugify, storyPath } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases, strips punctuation and accents", () => {
    expect(slugify("Macron’s Café visit: 'a success' — PM")).toBe("macrons-cafe-visit-a-success-pm");
  });

  it("cuts long headlines on a word boundary", () => {
    const slug = slugify("word ".repeat(40), 30);
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toMatch(/^(word-)*word$/);
  });

  it("returns empty for headlines with no latin letters", () => {
    expect(slugify("—")).toBe("");
  });
});

describe("storyPath and parseStoryId", () => {
  it("round-trips the id", () => {
    const path = storyPath(42, "Bank of England holds rates");
    expect(path).toBe("/story/42-bank-of-england-holds-rates");
    expect(parseStoryId(path.split("/")[2])).toBe(42);
  });

  it("works without a slug", () => {
    expect(storyPath(7, "!!!")).toBe("/story/7");
    expect(parseStoryId("7")).toBe(7);
  });

  it("ignores a stale slug", () => {
    expect(parseStoryId("42-an-older-headline")).toBe(42);
  });

  it("rejects junk", () => {
    expect(parseStoryId("abc")).toBeNull();
    expect(parseStoryId("0")).toBeNull();
    expect(parseStoryId("12abc")).toBeNull();
    expect(parseStoryId("99999999999")).toBeNull();
  });
});
