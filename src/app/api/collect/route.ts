import { isBot, optedOut, parseCollect, recordEvent } from "@/lib/analytics";

/**
 * Beacon endpoint for src/components/Analytics.tsx. Always answers 204 so a
 * visitor's page never waits on, or learns anything from, the counting.
 */
export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
  const userAgent = request.headers.get("user-agent");
  if (process.env.ANALYTICS === "off" || isBot(userAgent) || optedOut(request.headers)) return done;

  const host = new URL(request.url).hostname;
  const body = await request.json().catch(() => null);
  const event = parseCollect(body, host);
  if (!event) return done;

  // Only used to derive today's visitor hash; never stored.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? request.headers.get("x-real-ip") ?? "";
  try {
    await recordEvent(event, ip, userAgent!, host);
  } catch (err) {
    console.error("[analytics]", err);
  }
  return done;
}
