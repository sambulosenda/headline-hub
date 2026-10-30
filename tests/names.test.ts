import { describe, expect, it } from "vitest";
import { ENTITIES, findEntity } from "@/config/entities";
import { candidateNames, countNames, entitiesIn, MIN_OUTLETS } from "@/lib/names";

describe("candidateNames", () => {
  it("finds multi-word names and drops labels and titles", () => {
    expect(candidateNames("Watch: Supreme Court rules on Rwanda plan")).toEqual(["Supreme Court"]);
    expect(candidateNames("Bank of England holds rates as Andrew Bailey warns")).toEqual(["Bank of England", "Andrew Bailey"]);
    expect(candidateNames("Prime Minister Keir Starmer's speech: what we learned")).toEqual(["Keir Starmer"]);
    expect(candidateNames("Live updates: Hurricane Melissa hits Jamaica")).toEqual(["Hurricane Melissa"]);
    expect(candidateNames("Jude Bellingham, Real Madrid star, injured")).toEqual(["Jude Bellingham", "Real Madrid"]);
  });

  it("ignores single words and long Title Case runs", () => {
    expect(candidateNames("Starmer says NHS reforms will go ahead")).toEqual([]);
    expect(candidateNames("Council Approves New Budget For Schools")).toEqual([]);
  });
});

describe("entitiesIn", () => {
  it("matches whole words and aliases, including possessives", () => {
    expect(entitiesIn("Man Utd sack manager after Arsenal's win").map((e) => e.slug)).toEqual(["arsenal", "manchester-united"]);
    expect(entitiesIn("Mnangagwa opens new hospital").map((e) => e.slug)).toEqual(["emmerson-mnangagwa"]);
  });

  it("doesn't match inside other words", () => {
    expect(entitiesIn("Unarsenalled pundit says nothing")).toEqual([]);
    expect(entitiesIn("Metadata rules change")).toEqual([]);
  });
});

describe("countNames", () => {
  const h = (title: string, outletId: string) => ({ title, outletId });

  it("counts listed entities and names spotted by enough outlets", () => {
    const counts = countNames([
      h("Hurricane Melissa nears Jamaica", "bbc"),
      h("Hurricane Melissa: thousands flee", "guardian"),
      h("What we know about Hurricane Melissa", "sky"),
      h("Rising Star Award goes to newcomer", "bbc"),
      h("Rising Star Award shortlist", "guardian"),
      h("Arsenal win again", "bbc"),
    ]);
    expect(counts).toContainEqual({ slug: "hurricane-melissa", name: "Hurricane Melissa", kind: "auto", outlets: 3, articles: 3 });
    expect(counts).toContainEqual({ slug: "arsenal", name: "Arsenal", kind: "club", outlets: 1, articles: 1 });
    expect(counts.find((c) => c.slug === "rising-star-award")).toBeUndefined();
    expect(MIN_OUTLETS).toBe(3);
  });

  it("leaves names already covered by a listed entity or country to that page", () => {
    const counts = countNames(
      ["bbc", "guardian", "sky"].flatMap((o) => [h("Keir Starmer visits Leeds", o), h("South Africa votes", o)]),
    );
    expect(counts.map((c) => c.slug)).toEqual(["keir-starmer"]);
  });

  it("merges spellings that share a slug, like curly and straight apostrophes", () => {
    const counts = countNames([
      h("Michelle O’Neill meets Taoiseach", "bbc"),
      h("Michelle O’Neill: what she said", "guardian"),
      h("Michelle O'Neill visits Derry", "sky"),
      h("Michelle O'Neill responds", "itv"),
      h("Michelle O'Neill on Stormont", "rte"),
    ]);
    expect(counts).toEqual([{ slug: "michelle-o-neill", name: "Michelle O'Neill", kind: "auto", outlets: 5, articles: 5 }]);
  });
});

describe("entity config", () => {
  it("has unique slugs and the name among the terms", () => {
    expect(new Set(ENTITIES.map((e) => e.slug)).size).toBe(ENTITIES.length);
    for (const e of ENTITIES) {
      expect(e.slug).toMatch(/^[a-z0-9-]+$/);
      expect(e.terms[0]).toBe(e.name);
    }
    expect(findEntity("brighton")?.terms).toContain("Brighton & Hove Albion");
  });
});
