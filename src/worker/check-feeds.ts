/**
 * Fetch and parse every configured feed once and print a health report.
 * Writes nothing to the database. Exits 1 if any feed fails.
 *
 *   npm run check-feeds
 *
 * Pass URLs to vet candidate feeds instead of the configured ones:
 *
 *   npm run check-feeds -- https://example.com/feed/ https://example.org/rss
 */
import { OUTLETS } from "../config/outlets";
import { parseFeed } from "../lib/feeds";
import { isAllowed, USER_AGENT } from "../lib/robots";

const TIMEOUT_MS = 15_000;
const STALE_DAYS = 7;

interface Result {
  outlet: string;
  url: string;
  ok: boolean;
  detail: string;
}

async function check(outlet: string, url: string): Promise<Result> {
  const headers = { "User-Agent": USER_AGENT };
  try {
    const { origin, pathname, search } = new URL(url);
    const robots = await fetch(`${origin}/robots.txt`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then((r) => (r.ok ? r.text() : ""))
      .catch(() => "");
    if (!isAllowed(robots, pathname + search)) return { outlet, url, ok: false, detail: "blocked by robots.txt" };

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return { outlet, url, ok: false, detail: `HTTP ${res.status}` };
    const items = await parseFeed(await res.text());
    if (items.length === 0) return { outlet, url, ok: false, detail: "no items" };

    const newest = Math.max(...items.map((i) => i.publishedAt?.getTime() ?? 0));
    const ageDays = newest ? (Date.now() - newest) / 86_400_000 : null;
    const age = ageDays === null ? "no dates" : ageDays < 1 ? `${Math.round(ageDays * 24)}h old` : `${ageDays.toFixed(1)}d old`;
    const stale = ageDays !== null && ageDays > STALE_DAYS;
    return { outlet, url, ok: !stale, detail: `${items.length} items, newest ${age}${stale ? " (stale)" : ""}` };
  } catch (err) {
    return { outlet, url, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const candidates = process.argv.slice(2).filter((a) => a.startsWith("http"));
  const jobs =
    candidates.length > 0
      ? candidates.map((url) => () => check(new URL(url).hostname, url))
      : OUTLETS.flatMap((o) => o.feeds.map((f) => () => check(o.name, f.url)));
  const results: Result[] = [];
  for (let i = 0; i < jobs.length; i += 6) {
    results.push(...(await Promise.all(jobs.slice(i, i + 6).map((j) => j()))));
  }
  for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.outlet.padEnd(26)} ${r.detail.padEnd(32)} ${r.url}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} feeds healthy`);
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("check-feeds.ts")) void main();
