import { MUTES_COOKIE, parseMutes } from "@/lib/mutes";
import { countUpdates } from "@/lib/queries";
import { parseScope, sseEvent } from "@/lib/sse";

const POLL_MS = 15_000;
/** Close well inside serverless time limits; EventSource reconnects on its own. */
const MAX_STREAM_MS = 4 * 60_000;

/**
 * Server-Sent Events: tells an open page how many stories are new or have new
 * coverage since the article id it loaded with. Polls Postgres, so it works the
 * same whether the ingest worker runs on this machine or elsewhere.
 */
export async function GET(request: Request) {
  const { filters: scope, since } = parseScope(new URL(request.url).searchParams);
  const cookie = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${MUTES_COOKIE}=`))
    ?.slice(MUTES_COOKIE.length + 1);
  const filters = { ...scope, mutes: parseMutes(cookie ? decodeURIComponent(cookie) : null) };
  const encoder = new TextEncoder();
  const { signal } = request;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      const started = Date.now();
      let last = "";
      send("retry: 5000\n\n");
      while (!signal.aborted && Date.now() - started < MAX_STREAM_MS) {
        try {
          const counts = await countUpdates(filters, since);
          const key = `${counts.newStories}/${counts.updatedStories}`;
          if (key !== last) {
            send(sseEvent("updates", counts, counts.latestId));
            last = key;
          } else {
            send(": keep-alive\n\n");
          }
        } catch (err) {
          console.error("[updates] poll failed", err);
          send(": poll failed\n\n");
        }
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, POLL_MS);
          signal.addEventListener("abort", () => (clearTimeout(timer), resolve(null)), { once: true });
        });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
