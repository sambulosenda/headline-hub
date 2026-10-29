import { COUNTRIES } from "@/config/countries";

const matchers = COUNTRIES.map((c) => ({
  code: c.code,
  // Whole words only, so "anc" doesn't match "dance" and "ruto" doesn't match "brutons".
  pattern: new RegExp(`(?<![\\p{L}\\p{N}])(?:${c.terms.map(escape).join("|")})(?![\\p{L}\\p{N}])`, "u"),
}));

function escape(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[ -]/g, "[ -]");
}

/** Countries named in an article's headline or summary, sorted. */
export function tagCountries(title: string, summary: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  return matchers.filter((m) => m.pattern.test(text)).map((m) => m.code).sort();
}
