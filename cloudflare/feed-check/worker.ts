/**
 * Throwaway Worker that runs the feed health check from Cloudflare's network,
 * to see which publishers block requests from there before we move ingest.
 * Writes nothing anywhere. See README.md for how to run it.
 */
import { checkAll, feedJobs } from "../../src/worker/check-feeds";

interface Env {
  /** Set with `wrangler secret put CHECK_TOKEN`, so strangers can't make us hit 363 feeds. */
  CHECK_TOKEN?: string;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!env.CHECK_TOKEN || url.searchParams.get("token") !== env.CHECK_TOKEN) {
      return new Response("Not found\n", { status: 404 });
    }
    const egress = await fetch("https://api.ipify.org")
      .then((r) => r.text())
      .catch(() => "unknown");
    const results = await checkAll(feedJobs(url.searchParams.getAll("url")));
    const failed = results.filter((r) => !r.ok);
    const lines = [
      `Checked from Cloudflare, colo ${(request as { cf?: { colo?: string } }).cf?.colo ?? "?"}, egress IP ${egress}`,
      `${results.length - failed.length}/${results.length} feeds healthy`,
      "",
      ...results.map((r) => `${r.ok ? "ok  " : "FAIL"}\t${r.outlet}\t${r.detail}\t${r.url}`),
    ];
    return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  },
};

export default worker;
