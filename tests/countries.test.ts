import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/config/countries";
import { OUTLETS } from "@/config/outlets";
import { tagCountries } from "@/lib/countries";

describe("tagCountries", () => {
  it("counts every story from a national outlet for its country", () => {
    expect(tagCountries("Council approves new budget", "", "zw")).toEqual(["zw"]);
  });

  it("finds countries named in the headline or summary", () => {
    expect(tagCountries("Floods hit Harare suburbs", "")).toEqual(["zw"]);
    expect(tagCountries("Markets slide", "The naira fell against the dollar while Accra traders waited")).toEqual(["gh", "ng"]);
    expect(tagCountries("ZANU-PF congress opens", "")).toEqual(["zw"]);
    expect(tagCountries("Zanu PF congress opens", "")).toEqual(["zw"]);
  });

  it("matches whole words only", () => {
    expect(tagCountries("Dance festival returns", "Brutons and Kenyanite are not places")).toEqual([]);
    expect(tagCountries("ANC wins vote", "")).toEqual(["za"]);
  });

  it("is case-insensitive and sorted", () => {
    expect(tagCountries("KENYA and UGANDA sign deal", "", "tz")).toEqual(["ke", "tz", "ug"]);
  });
});

describe("country config", () => {
  it("only gives outlets known country codes", () => {
    const codes = new Set(COUNTRIES.map((c) => c.code));
    for (const o of OUTLETS) if (o.country) expect(codes.has(o.country), o.id).toBe(true);
  });

  it("has a national outlet for every country page", () => {
    for (const c of COUNTRIES) expect(OUTLETS.some((o) => o.country === c.code), c.name).toBe(true);
  });
});
