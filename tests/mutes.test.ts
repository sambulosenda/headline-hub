import { describe, expect, it } from "vitest";
import { cleanKeyword, likePattern, NO_MUTES, parseMutes, serializeMutes, toggle } from "@/lib/mutes";

describe("parseMutes", () => {
  it("round-trips valid mutes", () => {
    const mutes = { outlets: ["bbc"], topics: ["football"], keywords: ["love island"] };
    expect(parseMutes(serializeMutes(mutes))).toEqual(mutes);
  });

  it("drops unknown ids, junk and duplicates", () => {
    const raw = JSON.stringify({
      outlets: ["bbc", "bbc", "not-a-source", 42],
      topics: ["football", "'; drop table"],
      keywords: ["  Love   Island ", "x", "love island"],
    });
    expect(parseMutes(raw)).toEqual({ outlets: ["bbc"], topics: ["football"], keywords: ["love island"] });
  });

  it("keeps at most 30 keywords, in order", () => {
    const keywords = Array.from({ length: 35 }, (_, i) => `kw${i}`);
    expect(parseMutes(JSON.stringify({ keywords })).keywords).toEqual(keywords.slice(0, 30));
  });

  it("treats malformed cookies as no mutes", () => {
    expect(parseMutes("{nope")).toEqual(NO_MUTES);
    expect(parseMutes("null")).toEqual(NO_MUTES);
    expect(parseMutes(undefined)).toEqual(NO_MUTES);
  });
});

describe("helpers", () => {
  it("normalises keywords", () => {
    expect(cleanKeyword("  Strictly  Come Dancing ")).toBe("strictly come dancing");
    expect(cleanKeyword("a")).toBeNull();
  });

  it("toggles values", () => {
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
  });

  it("escapes LIKE wildcards", () => {
    expect(likePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });
});
