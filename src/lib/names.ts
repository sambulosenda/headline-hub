import { COUNTRIES } from "@/config/countries";
import { ENTITIES, entitySlug, type Entity } from "@/config/entities";
import { OUTLETS } from "@/config/outlets";

/** How many different outlets must use a name before it gets a page of its own. */
export const MIN_OUTLETS = 3;
/** Names are counted over headlines from this many hours. */
export const TRENDING_HOURS = 24;

export interface NameCount {
  slug: string;
  name: string;
  /** "auto" for names found in headlines, otherwise the curated entity's kind. */
  kind: Entity["kind"] | "auto";
  outlets: number;
  articles: number;
}

export interface Headline {
  title: string;
  outletId: string;
}

/** Capitalised words that start headlines or label them, not names. */
const NOT_NAMES = new Set(
  (
    "a an the and or but if as at by for from in into of off on onto out over to up with without " +
    "after before amid against about above below between during since until while " +
    "how why what when where who which whose will would can could should may might must " +
    "is are was were be been has have had do does did not no yes " +
    "this that these those his her its their our my your he she they we you it i " +
    "watch live breaking exclusive opinion analysis video videos pictures photos explainer review reviews " +
    "inside meet new top latest update updates report reports news podcast quiz " +
    "first last next more most all every some any one two three " +
    "monday tuesday wednesday thursday friday saturday sunday " +
    "january february march april may june july august september october november december " +
    "mr mrs ms dr sir lady lord " +
    "former ex prime minister president chancellor secretary chief ceo boss coach manager captain " +
    "star striker midfielder defender goalkeeper singer actor actress rapper presenter judge police officer mp mps"
  ).split(" "),
);
const CONNECTORS = new Set(["of", "de", "da", "van", "von", "bin", "del", "al"]);
const CAPITALISED = /^\p{Lu}[\p{L}\p{M}\p{N}.'’-]*$/u;
const TRAILING_PUNCTUATION = /[,:;.!?)"”’'…|]+$/u;

/** Runs of 2 to 4 capitalised words in one headline, e.g. "Supreme Court" or "Bank of England". */
export function candidateNames(title: string): string[] {
  const found: string[] = [];
  let run: string[] = [];
  const flush = () => {
    while (run.length > 0 && CONNECTORS.has(run.at(-1)!)) run.pop();
    while (run.length > 0 && NOT_NAMES.has(run[0].toLowerCase())) run.shift();
    const words = run.filter((w) => !CONNECTORS.has(w));
    if (words.length >= 2 && run.length <= 4 && !words.every((w) => NOT_NAMES.has(w.toLowerCase()))) {
      found.push(run.join(" "));
    }
    run = [];
  };

  for (const raw of title.split(/\s+/)) {
    let word = raw.replace(/^[("“‘'[]+/u, "");
    let ends = TRAILING_PUNCTUATION.test(word) || /[—–]/.test(word);
    word = word.replace(TRAILING_PUNCTUATION, "");
    if (/['’]s$/u.test(word)) {
      word = word.slice(0, -2);
      ends = true;
    }
    if (word && CAPITALISED.test(word) && /\p{L}/u.test(word)) {
      run.push(word);
    } else if (CONNECTORS.has(word) && run.length > 0) {
      run.push(word);
    } else {
      flush();
      continue;
    }
    if (ends) flush();
  }
  flush();
  return found;
}

function wordPattern(term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
}

const entityPatterns = ENTITIES.map((e) => ({ entity: e, patterns: e.terms.map(wordPattern) }));

/** Listed entities a headline names, in list order. */
export function entitiesIn(text: string, limit = 3): Entity[] {
  const found: Entity[] = [];
  for (const { entity, patterns } of entityPatterns) {
    if (patterns.some((p) => p.test(text))) found.push(entity);
    if (found.length >= limit) break;
  }
  return found;
}

/** Names already covered elsewhere: listed entities, countries and our own outlets. */
const coveredTerms = [
  ...ENTITIES.flatMap((e) => e.terms),
  ...COUNTRIES.flatMap((c) => [c.name, ...c.terms]),
  ...OUTLETS.map((o) => o.name),
].map(wordPattern);

/**
 * Counts listed entities and newly spotted names across headlines. A spotted
 * name only counts once MIN_OUTLETS different outlets have used it, which
 * filters out one outlet's Title Case headlines.
 */
export function countNames(headlines: Headline[]): NameCount[] {
  const listed = new Map<string, { outlets: Set<string>; articles: number }>();
  const spotted = new Map<string, { outlets: Set<string>; articles: number; forms: Map<string, number> }>();

  for (const { title, outletId } of headlines) {
    for (const { entity, patterns } of entityPatterns) {
      if (!patterns.some((p) => p.test(title))) continue;
      const entry = listed.get(entity.slug) ?? { outlets: new Set(), articles: 0 };
      entry.outlets.add(outletId);
      entry.articles++;
      listed.set(entity.slug, entry);
    }
    for (const name of new Set(candidateNames(title))) {
      // Group by slug, the table's key, so "O’Neill" and "O'Neill" count as one name.
      const key = entitySlug(name) || name.toLowerCase();
      const entry = spotted.get(key) ?? { outlets: new Set(), articles: 0, forms: new Map() };
      entry.outlets.add(outletId);
      entry.articles++;
      entry.forms.set(name, (entry.forms.get(name) ?? 0) + 1);
      spotted.set(key, entry);
    }
  }

  const counts: NameCount[] = [];
  for (const entity of ENTITIES) {
    const entry = listed.get(entity.slug);
    if (entry) counts.push({ slug: entity.slug, name: entity.name, kind: entity.kind, outlets: entry.outlets.size, articles: entry.articles });
  }
  const listedSlugs = new Set(ENTITIES.map((e) => e.slug));
  for (const entry of spotted.values()) {
    if (entry.outlets.size < MIN_OUTLETS) continue;
    const name = [...entry.forms].sort((a, b) => b[1] - a[1])[0][0];
    const slug = entitySlug(name);
    if (!slug || listedSlugs.has(slug) || coveredTerms.some((p) => p.test(name))) continue;
    counts.push({ slug, name, kind: "auto", outlets: entry.outlets.size, articles: entry.articles });
  }
  return counts.sort((a, b) => b.outlets - a.outlets || b.articles - a.articles || a.name.localeCompare(b.name));
}
