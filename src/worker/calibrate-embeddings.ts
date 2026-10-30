/**
 * Pick match thresholds for Workers AI's bge-small embeddings, by replaying
 * recent headlines and comparing the stories they form with the ones today's
 * MiniLM clustering forms. Writes nothing.
 *
 *   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run calibrate-embeddings -- --hours=6
 *
 * The token needs the "Workers AI: Read" permission. Uses the free daily allowance.
 */
import { eq, gt } from "drizzle-orm";
import { BGE_SMALL_THRESHOLDS, WORKERS_AI_MODEL } from "../../cloudflare/ingest/embed";
import { closeDb, getDb } from "../db/client";
import { articles, outlets } from "../db/schema";
import { getEmbedder } from "../lib/embeddings";
import { MINILM_THRESHOLDS, type Thresholds } from "../lib/similarity";
import { cluster, type Row } from "./recluster";

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

const pairs = (n: number) => (n * (n - 1)) / 2;

/** How well `found` reproduces `reference`, counting pairs of articles put in the same story. */
export function pairAgreement(reference: number[][], found: number[][]): { precision: number; recall: number; f1: number } {
  const refOf = new Map<number, number>();
  reference.forEach((g, i) => g.forEach((id) => refOf.set(id, i)));
  let together = 0;
  for (const group of found) {
    const counts = new Map<number, number>();
    for (const id of group) counts.set(refOf.get(id)!, (counts.get(refOf.get(id)!) ?? 0) + 1);
    for (const n of counts.values()) together += pairs(n);
  }
  const refPairs = reference.reduce((sum, g) => sum + pairs(g.length), 0);
  const foundPairs = found.reduce((sum, g) => sum + pairs(g.length), 0);
  const precision = foundPairs ? together / foundPairs : 1;
  const recall = refPairs ? together / refPairs : 1;
  return { precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0 };
}

async function workersAi(texts: string[]): Promise<number[][]> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.");
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${WORKERS_AI_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts.slice(i, i + 100) }),
    });
    if (!res.ok) throw new Error(`Workers AI: HTTP ${res.status} ${await res.text()}`);
    const { result } = (await res.json()) as { result: { data: number[][] } };
    out.push(...result.data.map((v) => v.map((x) => x / (Math.hypot(...v) || 1))));
  }
  return out;
}

async function main() {
  const db = getDb();
  const hours = Number(arg("hours") ?? 6);
  const rows: Row[] = await db
    .select({ id: articles.id, title: articles.title, outletName: outlets.name, storyId: articles.storyId, embedding: articles.embedding, publishedAt: articles.publishedAt })
    .from(articles)
    .innerJoin(outlets, eq(outlets.id, articles.outletId))
    .where(gt(articles.publishedAt, new Date(Date.now() - hours * 3_600_000)))
    .orderBy(articles.publishedAt, articles.id);
  console.log(`[calibrate] ${rows.length} headlines from the last ${hours}h`);

  const minilm = await getEmbedder();
  if (!minilm) throw new Error("The MiniLM model is needed as the reference; unset EMBEDDINGS=off.");
  const missing = rows.filter((r) => !r.embedding);
  for (let i = 0; i < missing.length; i += 64) {
    const vectors = await minilm(missing.slice(i, i + 64).map((r) => r.title));
    missing.slice(i, i + 64).forEach((r, j) => (r.embedding = vectors[j]));
  }
  const reference = cluster(rows, MINILM_THRESHOLDS);

  const bge = await workersAi(rows.map((r) => r.title));
  const bgeRows = rows.map((r, i) => ({ ...r, embedding: bge[i] }));

  const tries: Thresholds[] = [BGE_SMALL_THRESHOLDS];
  for (let semantic = 0.7; semantic <= 0.881; semantic += 0.02) {
    for (const gap of [0.04, 0.08]) tries.push({ semantic, strong: Math.min(semantic + gap, 0.97), assist: semantic - 0.12 });
  }
  const results = tries.map((t) => {
    const found = cluster(bgeRows, t);
    return { t, stories: found.length, ...pairAgreement(reference, found) };
  });
  results.sort((a, b) => b.f1 - a.f1);
  console.log(`MiniLM reference: ${reference.length} stories\n`);
  console.log("strong semantic assist  stories  precision recall  f1");
  for (const r of results.slice(0, 10)) {
    const f = (x: number) => x.toFixed(2).padStart(6);
    console.log(`${f(r.t.strong)} ${f(r.t.semantic)}  ${f(r.t.assist)}  ${String(r.stories).padStart(7)}  ${f(r.precision)}    ${f(r.recall)} ${f(r.f1)}`);
  }
  const best = results[0].t;
  console.log(`\nBest: { strong: ${best.strong.toFixed(2)}, semantic: ${best.semantic.toFixed(2)}, assist: ${best.assist.toFixed(2)} }`);
  await closeDb();
}

if (process.argv[1]?.endsWith("calibrate-embeddings.ts")) {
  void main().catch(async (err) => {
    console.error(err);
    process.exitCode = 1;
    await closeDb();
  });
}
