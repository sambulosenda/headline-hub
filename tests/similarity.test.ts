import { describe, expect, it } from "vitest";
import { findStory, headline, keyTerms, matchScore, titleTokens } from "@/lib/similarity";

/** Unit vector at a given cosine to [1, 0]. */
const at = (cos: number) => [cos, Math.sqrt(1 - cos * cos)];
const base = [1, 0];

describe("titleTokens", () => {
  it("drops stopwords and stems plurals", () => {
    expect(titleTokens("The Bank of England holds rates")).toEqual(["bank", "england", "hold", "rate"]);
  });
});

describe("keyTerms", () => {
  it("keeps names, places and numbers but not the sentence-case first word", () => {
    expect(keyTerms("Toney nightclub assault trial set for June 2028")).toEqual(["june", "2028"]);
    expect(keyTerms("England's Ivan Toney to stand trial during Euro 2028")).toEqual(["ivan", "toney", "euro", "2028"]);
  });
});

describe("matchScore without embeddings", () => {
  it("matches two outlets' versions of one event", () => {
    const a = headline("Bank of England holds interest rates at 4%");
    expect(matchScore(a, headline("Bank of England keeps interest rates on hold at 4%"))).toBeGreaterThan(0);
  });

  it("is not diluted by one long headline", () => {
    const bbc = headline("Toney nightclub assault trial set for June 2028");
    const guardian = headline(
      "England's Ivan Toney to stand trial during Euro 2028 after denying assault charge",
    );
    expect(matchScore(bbc, guardian)).toBeGreaterThan(0);
  });

  it("does not match different stories that share a word or two", () => {
    const a = headline("Bank of England holds interest rates at 4%");
    expect(matchScore(a, headline("England beat Wales in Six Nations opener"))).toBe(0);
    expect(matchScore(a, headline("Bank shares fall as markets slide"))).toBe(0);
  });

  it("keeps look-alike stories with different names apart", () => {
    const a = headline("Family pays tribute to teenager killed in M6 crash");
    const b = headline("Family pays tribute to grandmother killed in Leeds crash");
    expect(matchScore(a, b)).toBe(0);
  });
});

describe("matchScore with embeddings", () => {
  const boe = (title: string, v: number[]) => headline(title, v);

  it("matches reworded headlines that share no wording but mean the same", () => {
    const a = boe("Hello Kitty maker Sanrio shares surge on record profit", base);
    const b = boe("Sanrio stock jumps after company posts best ever results", at(0.74));
    expect(matchScore(a, b)).toBeCloseTo(0.74);
  });

  it("rejects a semantic match when names and places disagree", () => {
    const a = boe("Family pays tribute to teenager killed in M6 crash", base);
    const b = boe("Family pays tribute to grandmother killed in Leeds crash", at(0.8));
    expect(matchScore(a, b)).toBe(0);
  });

  it("trusts a very strong semantic match on its own", () => {
    const a = boe("Spain train crash kills 21 near Seville", base);
    const b = boe("Andalusia rail disaster: death toll climbs", at(0.9));
    expect(matchScore(a, b)).toBeCloseTo(0.9);
  });

  it("accepts a weaker match backed by shared names and words", () => {
    const a = boe("Putin praises Musk after SpaceX satellite talks", base);
    const b = boe("Elon Musk is a 'real genius', Putin says after satellite talks", at(0.6));
    expect(matchScore(a, b)).toBeCloseTo(0.6);
  });

  it("rejects weak matches", () => {
    const a = boe("Bank of England holds interest rates at 4%", base);
    const b = boe("Bank of England governor warns on AI jobs", at(0.5));
    expect(matchScore(a, b)).toBe(0);
  });
});

describe("findStory", () => {
  it("picks the closest matching story", () => {
    const candidates = [
      { ...headline("Arsenal beat Spurs 3-1 in north London derby"), storyId: 1 },
      { ...headline("Bank of England holds interest rates at 4%"), storyId: 2 },
    ];
    expect(findStory(headline("Bank of England holds rates at 4% as inflation lingers"), candidates)).toBe(2);
    expect(findStory(headline("Heatwave warning issued for south-east"), candidates)).toBeNull();
  });
});
