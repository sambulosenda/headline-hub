import { describe, expect, it } from "vitest";
import { pairAgreement } from "../src/worker/calibrate-embeddings";

describe("pairAgreement", () => {
  it("is perfect for the same grouping in any order", () => {
    expect(pairAgreement([[1, 2], [3]], [[3], [2, 1]])).toEqual({ precision: 1, recall: 1, f1: 1 });
  });

  it("penalises merging and splitting stories", () => {
    // Reference pairs: (1,2) and (3,4). Merged: all six pairs, two of them right.
    const merged = pairAgreement([[1, 2], [3, 4]], [[1, 2, 3, 4]]);
    expect(merged.precision).toBeCloseTo(2 / 6);
    expect(merged.recall).toBe(1);
    const split = pairAgreement([[1, 2], [3, 4]], [[1], [2], [3, 4]]);
    expect(split.precision).toBe(1);
    expect(split.recall).toBe(0.5);
  });
});
