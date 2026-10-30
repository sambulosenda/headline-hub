/**
 * Rebuild story clusters for recent articles, backfilling embeddings first.
 *
 *   npm run recluster -- --dry-run                    # report only
 *   npm run recluster -- --dry-run --threshold=0.65,0.7,0.75
 *   npm run recluster                                  # apply with the default threshold
 *
 * Options: --hours=72 (window), --show=15 (clusters to print).
 */
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { closeDb, getDb } from "../db/client";
import { articles, outlets, stories } from "../db/schema";
import { getEmbedder, sameModel } from "../lib/embeddings";
import { findStory, headline, SEMANTIC_THRESHOLD, type ClusterCandidate, type Thresholds } from "../lib/similarity";
import { rescoreStories } from "./ingest";

const CLUSTER_WINDOW_MS = 48 * 3_600_000;
const BATCH = 64;

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

export interface Row {
  id: number;
  title: string;
  outletName: string;
  storyId: number | null;
  embedding: number[] | null;
  embeddingModel?: string | null;
  publishedAt: Date;
}

/** Cluster articles in publish order, the same way ingest does. Returns article id → group index. */
export function cluster(rows: Row[], threshold: number | Thresholds): number[][] {
  const groups: number[][] = [];
  const candidates: (ClusterCandidate & { at: number })[] = [];
  for (const row of rows) {
    const at = row.publishedAt.getTime();
    const live = candidates.filter((c) => at - c.at <= CLUSTER_WINDOW_MS);
    const h = headline(row.title, row.embedding);
    let group = findStory(h, live, threshold);
    if (group === null) {
      group = groups.length;
      groups.push([]);
    }
    groups[group].push(row.id);
    candidates.push({ ...h, storyId: group, at });
  }
  return groups;
}

async function main() {
  const db = getDb();
  const dryRun = process.argv.includes("--dry-run");
  const hours = Number(arg("hours") ?? 72);
  const show = Number(arg("show") ?? 15);
  const thresholds = (arg("threshold") ?? String(SEMANTIC_THRESHOLD)).split(",").map(Number);
  if (!dryRun && thresholds.length > 1) throw new Error("Pass a single --threshold when applying.");

  const since = new Date(Date.now() - hours * 3_600_000);
  const rows: Row[] = await db
    .select({
      id: articles.id,
      title: articles.title,
      outletName: outlets.name,
      storyId: articles.storyId,
      embedding: articles.embedding,
      embeddingModel: articles.embeddingModel,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .where(gt(articles.publishedAt, since))
    .orderBy(articles.publishedAt, articles.id);

  const embed = await getEmbedder();
  // Vectors another model made (e.g. Workers AI) can't be compared with this one's, so they count as missing.
  for (const row of rows) row.embedding = sameModel(row, embed?.model);
  const missing = rows.filter((r) => !r.embedding);
  if (embed && missing.length > 0) {
    console.log(`[recluster] embedding ${missing.length} headlines...`);
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      const vectors = await embed(batch.map((r) => r.title));
      for (const [j, row] of batch.entries()) {
        row.embedding = vectors[j];
        if (!dryRun) {
          await db.update(articles).set({ embedding: row.embedding, embeddingModel: embed.model }).where(eq(articles.id, row.id));
        }
      }
    }
  }
  console.log(`[recluster] ${rows.length} articles in the last ${hours}h, embeddings ${embed ? "on" : "off"}`);

  const byId = new Map(rows.map((r) => [r.id, r]));
  let chosen: number[][] = [];
  for (const threshold of thresholds) {
    const groups = cluster(rows, threshold);
    const outletCounts = groups.map((g) => new Set(g.map((id) => byId.get(id)!.outletName)).size);
    const multi = outletCounts.filter((n) => n > 1).length;
    console.log(
      `threshold=${threshold} stories=${groups.length} multi_outlet=${multi} (${((multi / groups.length) * 100).toFixed(1)}%) largest=${Math.max(...groups.map((g) => g.length))}`,
    );
    if (chosen.length === 0) chosen = groups;
  }

  const ranked = chosen
    .map((g) => g.map((id) => byId.get(id)!))
    .filter((g) => new Set(g.map((r) => r.outletName)).size > 1)
    .sort((a, b) => b.length - a.length)
    .slice(0, show);
  console.log(`\nLargest multi-outlet stories at threshold=${thresholds[0]}:`);
  for (const group of ranked) {
    console.log(`\n  [${group.length}]`);
    for (const r of group) console.log(`    ${r.outletName.padEnd(18)} ${r.title}`);
  }

  if (dryRun) {
    await closeDb();
    return;
  }

  // Keep existing story ids where possible so links stay stable.
  const claimed = new Set<number>();
  for (const group of chosen) {
    const members = group.map((id) => byId.get(id)!);
    let storyId = members.map((m) => m.storyId).find((s): s is number => s !== null && !claimed.has(s));
    if (storyId === undefined) {
      const first = members[0];
      const [story] = await db
        .insert(stories)
        .values({ title: first.title, firstSeenAt: first.publishedAt, lastSeenAt: first.publishedAt })
        .returning({ id: stories.id });
      storyId = story.id;
    }
    claimed.add(storyId);
    const moved = members.filter((m) => m.storyId !== storyId).map((m) => m.id);
    if (moved.length > 0) await db.update(articles).set({ storyId }).where(inArray(articles.id, moved));
  }
  const rescored = await rescoreStories(db);
  const leftover = await db.$count(articles, and(gt(articles.publishedAt, since), isNull(articles.storyId)));
  console.log(`\n[recluster] applied: stories_rescored=${rescored} unassigned=${leftover}`);
  await closeDb();
}

if (process.argv[1]?.endsWith("recluster.ts")) {
  void main().catch(async (err) => {
    console.error(err);
    process.exitCode = 1;
    await closeDb();
  });
}
