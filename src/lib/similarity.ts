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

/** Distinctive, lightly stemmed words of a headline. */
export function titleTokens(title: string): string[] {
  const words = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9£$%]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
  return [...new Set(words)];
}

export function jaccard(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let shared = 0;
  for (const t of a) if (setB.has(t)) shared++;
  return shared / (a.length + b.length - shared);
}

export const SAME_STORY_THRESHOLD = 0.3;
const MIN_SHARED_TOKENS = 3;

/**
 * Phase 1 heuristic: two headlines describe the same event when they share
 * enough distinctive words. Phase 2 swaps this for embedding similarity.
 */
export function sameStory(a: readonly string[], b: readonly string[]): boolean {
  const setB = new Set(b);
  const shared = a.filter((t) => setB.has(t)).length;
  return shared >= MIN_SHARED_TOKENS && jaccard(a, b) >= SAME_STORY_THRESHOLD;
}

export interface ClusterCandidate {
  storyId: number;
  tokens: string[];
}

/** Best matching existing story for a headline, or null for a new story. */
export function findStory(tokens: string[], candidates: readonly ClusterCandidate[]): number | null {
  let best: { storyId: number; score: number } | null = null;
  for (const c of candidates) {
    if (!sameStory(tokens, c.tokens)) continue;
    const score = jaccard(tokens, c.tokens);
    if (!best || score > best.score) best = { storyId: c.storyId, score };
  }
  return best?.storyId ?? null;
}
