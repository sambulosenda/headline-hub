import { cosine } from "./embeddings";

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by for from has have he her his how i in into is it its " +
    "live latest new news of on or over says said she than that the their them they this to " +
    "up us video was watch we what when who why will with after about amid could would more " +
    "just one two first last you your not out no yes"
  ).split(" "),
);

function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function fold(word: string): string {
  return word.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** Distinctive, lightly stemmed words of a headline. */
export function titleTokens(title: string): string[] {
  const words = fold(title)
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9£$%]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
  return [...new Set(words)];
}

/**
 * Names, places and numbers: words capitalised mid-headline, plus anything
 * with a digit. Two reports of one event almost always share one of these,
 * while look-alike stories ("family pays tribute to man killed in crash")
 * usually don't.
 */
export function keyTerms(title: string): string[] {
  const words = title.replace(/['’]s\b/g, "").split(/[^\p{L}\p{N}£$%]+/u).filter(Boolean);
  const keys = words.filter((w, i) => /\d/.test(w) || (i > 0 && /^\p{Lu}/u.test(w)));
  return [...new Set(keys.map((w) => stem(fold(w))))].filter((w) => !STOPWORDS.has(w));
}

export function jaccard(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const shared = sharedCount(a, b);
  return shared / (a.length + b.length - shared);
}

function sharedCount(a: readonly string[], b: readonly string[]) {
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length;
}

/** Shared words over the shorter headline's words, so a long headline doesn't dilute the match. */
export function overlap(a: readonly string[], b: readonly string[]): number {
  const shorter = Math.min(a.length, b.length);
  return shorter === 0 ? 0 : sharedCount(a, b) / shorter;
}

/** Cosine above which an embedding match needs no other evidence. */
export const STRONG_SIMILARITY = 0.85;
/** Embedding similarity for a match, given at least one shared name, place or number. */
export const SEMANTIC_THRESHOLD = 0.7;
/** Weaker embedding match, accepted when backed by shared key terms and words. */
const SEMANTIC_ASSIST = 0.55;
const MIN_SHARED_TOKENS = 3;
const MIN_OVERLAP = 0.5;

export interface Headline {
  tokens: string[];
  keys: string[];
  embedding?: number[] | null;
  /** Live blogs, newsletters and roundups cover many events, so they never cluster. */
  roundup?: boolean;
}

const ROUNDUP_PATTERNS = [
  /[–—-]\s*(live|as it happened)$/i,
  /^live[:–—-]/i,
  /\blive (updates?|blog|coverage)\b/i,
  /\bas it happened\b/i,
  /\.\s+And,\s/, // NPR-style newsletter: "X. And, Y"
  /\b(newsletter|(?:morning|evening|daily) briefing|podcast|quiz|cartoon|football daily)\b/i,
];

export function isRoundup(title: string): boolean {
  return ROUNDUP_PATTERNS.some((re) => re.test(title.trim()));
}

export interface ClusterCandidate extends Headline {
  storyId: number;
}

export function headline(title: string, embedding: number[] | null = null): Headline {
  return { tokens: titleTokens(title), keys: keyTerms(title), embedding, roundup: isRoundup(title) };
}

/** True when both have key terms and none are shared: a strong sign of two different events. */
function keysDisagree(a: Headline, b: Headline) {
  return a.keys.length > 0 && b.keys.length > 0 && sharedCount(a.keys, b.keys) === 0;
}

/**
 * How strongly two headlines look like the same event, or 0 when they don't.
 * Embeddings carry the match when both have one; shared names, places and
 * numbers guard against look-alike stories. Without embeddings, word overlap.
 */
export function matchScore(a: Headline, b: Headline, threshold = SEMANTIC_THRESHOLD): number {
  if (a.roundup || b.roundup) return 0;
  const sharedTokens = sharedCount(a.tokens, b.tokens);
  if (a.embedding && b.embedding) {
    const sim = cosine(a.embedding, b.embedding);
    if (sim >= STRONG_SIMILARITY) return sim;
    if (keysDisagree(a, b)) return 0;
    if (sim >= threshold) return sim;
    if (sim >= SEMANTIC_ASSIST && sharedCount(a.keys, b.keys) >= 1 && sharedTokens >= 2) return sim;
    return 0;
  }
  if (sharedTokens < MIN_SHARED_TOKENS || keysDisagree(a, b)) return 0;
  const score = overlap(a.tokens, b.tokens);
  return score >= MIN_OVERLAP ? score : 0;
}

/** Best matching existing story for a headline, or null for a new story. */
export function findStory(
  item: Headline,
  candidates: readonly ClusterCandidate[],
  threshold = SEMANTIC_THRESHOLD,
): number | null {
  let best: { storyId: number; score: number } | null = null;
  for (const c of candidates) {
    const score = matchScore(item, c, threshold);
    if (score > 0 && (!best || score > best.score)) best = { storyId: c.storyId, score };
  }
  return best?.storyId ?? null;
}
