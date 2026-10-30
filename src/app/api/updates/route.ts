import { loadPreferences, userForSession } from "@/lib/auth";
import { resolveEntities, resolveEntity } from "@/lib/entities";
import { MUTES_COOKIE, parseMutes } from "@/lib/mutes";
import { countUpdates } from "@/lib/queries";
import { parseScope, sseEvent } from "@/lib/sse";
import { readCookie, SESSION_COOKIE } from "@/lib/tokens";

const POLL_MS = 15_000;
/** Close well inside serverless time limits; EventSource reconnects on its own. */
const MAX_STREAM_MS = 4 * 60_000;

/**
 * Server-Sent Events: tells an open page how many stories are new or have new
 * coverage since the article id it loaded with. Polls Postgres, so it works the
 * same whether the ingest worker runs on this machine or elsewhere.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { filters: scope, since, entity, following } = parseScope(url.searchParams);
  const storyLevel = url.searchParams.get("stories") === "1";
  const cookieHeader = request.headers.get("cookie");
  const user = await userForSession(readCookie(cookieHeader, SESSION_COOKIE));
  const mutes = user ? await loadPreferences(user.id) : parseMutes(readCookie(cookieHeader, MUTES_COOKIE));
  let mentions: string[] | undefined;
  if (entity) mentions = (await resolveEntity(entity))?.terms ?? [];
  else if (following) mentions = (await resolveEntities(mutes.follows)).flatMap((e) => e.terms);
  // Nothing to match means nothing to watch, not "watch everything".
  if (mentions && mentions.length === 0) return new Response(null, { status: 204 });
  const filters = { ...scope, mutes, mentions };
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
          const counts = await countUpdates(filters, since, storyLevel);
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
