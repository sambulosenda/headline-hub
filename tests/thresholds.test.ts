import { describe, expect, it } from "vitest";
import { findStory, headline, MINILM_THRESHOLDS, matchScore } from "../src/lib/similarity";

describe("thresholds", () => {
  const a = { ...headline("Harare council approves water plan"), embedding: [1, 0] };
  const b = { ...headline("Harare council backs water plan"), embedding: [0.8, 0.6] };

  it("treats a number as the semantic cut-off with MiniLM's others", () => {
    expect(matchScore(a, b, 0.7)).toBe(matchScore(a, b, MINILM_THRESHOLDS));
  });

  it("lets another model's stricter cut-offs reject a MiniLM-level match", () => {
    expect(findStory(a, [{ ...b, storyId: 7 }])).toBe(7);
    expect(findStory(a, [{ ...b, storyId: 7 }], { strong: 0.95, semantic: 0.9, assist: 0.85 })).toBeNull();
  });
});
