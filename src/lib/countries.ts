import { COUNTRIES } from "@/config/countries";

const matchers = COUNTRIES.map((c) => ({
  code: c.code,
  // Whole words only, so "anc" doesn't match "dance" and "ruto" doesn't match "brutons".
  pattern: new RegExp(`(?<![\\p{L}\\p{N}])(?:${c.terms.map(escape).join("|")})(?![\\p{L}\\p{N}])`, "u"),
}));

function escape(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[ -]/g, "[ -]");
}

/**
 * Countries an article is about: the outlet's home country, plus any country
 * named in its headline or summary.
 */
export function tagCountries(title: string, summary: string, outletCountry?: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const found = new Set<string>();
  if (outletCountry) found.add(outletCountry);
  for (const m of matchers) if (m.pattern.test(text)) found.add(m.code);
  return [...found].sort();
}
