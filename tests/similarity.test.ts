import { describe, expect, it } from "vitest";
import { findStory, sameStory, titleTokens } from "@/lib/similarity";

describe("titleTokens", () => {
  it("drops stopwords and stems plurals", () => {
    expect(titleTokens("The Bank of England holds rates")).toEqual(["bank", "england", "hold", "rate"]);
  });
});

describe("sameStory", () => {
  const a = titleTokens("Bank of England holds interest rates at 4%");
  it("matches two outlets' versions of one event", () => {
    expect(sameStory(a, titleTokens("Bank of England keeps interest rates on hold at 4%"))).toBe(true);
  });

  it("does not match different stories that share a word or two", () => {
    expect(sameStory(a, titleTokens("England beat Wales in Six Nations opener"))).toBe(false);
    expect(sameStory(a, titleTokens("Bank shares fall as markets slide"))).toBe(false);
  });
});

describe("findStory", () => {
  it("picks the closest matching story", () => {
    const candidates = [
      { storyId: 1, tokens: titleTokens("Arsenal beat Spurs 3-1 in north London derby") },
      { storyId: 2, tokens: titleTokens("Bank of England holds interest rates at 4%") },
    ];
    expect(findStory(titleTokens("Bank of England holds rates at 4% as inflation lingers"), candidates)).toBe(2);
    expect(findStory(titleTokens("Heatwave warning issued for south-east"), candidates)).toBeNull();
  });
});
