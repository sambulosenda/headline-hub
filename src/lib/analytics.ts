import { createHash, randomBytes } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { analyticsEvents, analyticsSalts } from "@/db/schema";

/** Raw events older than this are deleted, once a day. */
export const RETENTION_DAYS = 400;
export const RANGES = [7, 30, 90] as const;

export type EventKind = "view" | "out";

export interface CollectInput {
  kind: EventKind;
  target: string;
  referrer: string | null;
}

const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|node-fetch|axios|go-http|java\//i;
/** Pages we never count: our own tools and the sign-in link. */
const SKIP_PATHS = /^\/(admin|api|auth)(\/|$)/;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_UA.test(userAgent);
}

/** Do Not Track and Global Privacy Control are honoured: nothing is recorded. */
export function optedOut(headers: Headers): boolean {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

export function deviceOf(userAgent: string): "mobile" | "desktop" {
  return /mobi|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";
}

/** The referring site's host, or null for direct visits and our own pages. */
export function referrerHost(raw: unknown, ownHost: string): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    return host && host !== ownHost.replace(/^www\./, "") ? host.slice(0, 100) : null;
  } catch {
    return null;
  }
}

/** Publisher link without the utm tags we add, so it matches the stored article URL. */
export function articleUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.searchParams.delete("utm_source");
    url.searchParams.delete("utm_medium");
    return url.toString();
  } catch {
    return null;
  }
}

/** Checks a beacon body; null means ignore it. */
export function parseCollect(body: unknown, ownHost: string): CollectInput | null {
  if (!body || typeof body !== "object") return null;
  const { k, t, r } = body as Record<string, unknown>;
  if (typeof t !== "string") return null;
  if (k === "view") {
    if (!t.startsWith("/") || t.length > 200 || SKIP_PATHS.test(t)) return null;
    return { kind: "view", target: t, referrer: referrerHost(r, ownHost) };
  }
  if (k === "out" && t.length <= 1000) {
    const url = articleUrl(t);
    return url ? { kind: "out", target: url, referrer: null } : null;
  }
  return null;
}

let cachedSalt: { day: string; salt: string } | null = null;

/** Today's salt (UTC). The first request of a day also deletes yesterday's and prunes old events. */
async function saltFor(day: string): Promise<string> {
  if (cachedSalt?.day === day) return cachedSalt.salt;
  const db = getDb();
  await db.insert(analyticsSalts).values({ day, salt: randomBytes(16).toString("hex") }).onConflictDoNothing();
  const [row] = await db.select().from(analyticsSalts).where(sql`${analyticsSalts.day} = ${day}::date`);
  await db.delete(analyticsSalts).where(lt(analyticsSalts.day, day));
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  await db.delete(analyticsEvents).where(sql`${analyticsEvents.createdAt} < ${cutoff}::timestamptz`);
  cachedSalt = { day, salt: row.salt };
  return row.salt;
}

/**
 * The same browser on the same network gets the same id for one day only.
 * Once the salt is gone the id can't be linked back to an address.
 */
export function visitorId(salt: string, ip: string, userAgent: string, host: string): string {
  return createHash("sha256").update(`${salt}|${ip}|${userAgent}|${host}`).digest("hex").slice(0, 16);
}

export async function recordEvent(input: CollectInput, ip: string, userAgent: string, host: string) {
  const salt = await saltFor(new Date().toISOString().slice(0, 10));
  await getDb()
    .insert(analyticsEvents)
    .values({
      kind: input.kind,
      target: input.target,
      referrer: input.referrer,
      visitor: visitorId(salt, ip, userAgent, host),
      device: deviceOf(userAgent),
    });
}

export interface Stats {
  views: number;
  visitors: number;
  clicks: number;
  daily: { day: string; views: number; visitors: number }[];
  pages: { path: string; views: number; visitors: number }[];
  referrers: { host: string; visits: number }[];
  outlets: { name: string; clicks: number }[];
  stories: { id: number | null; title: string; clicks: number }[];
  devices: { device: string; visitors: number }[];
}

type Row = Record<string, unknown>;

/** Everything the dashboard shows for the last `days` days (today included, UTC). */
export async function getStats(days: number): Promise<Stats> {
  const db = getDb();
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const inRange = sql`created_at >= ${since}::date`;
  const rows = async <T>(query: ReturnType<typeof sql>) => (await db.execute(query)) as unknown as (T & Row)[];

  const [totals] = await rows<{ views: number; visitors: number; clicks: number }>(sql`
    select count(*) filter (where kind = 'view')::int as views,
           count(distinct visitor) filter (where kind = 'view')::int as visitors,
           count(*) filter (where kind = 'out')::int as clicks
    from analytics_events where ${inRange}`);

  const daily = await rows<{ day: string; views: number; visitors: number }>(sql`
    select to_char(d, 'YYYY-MM-DD') as day,
           count(e.id)::int as views,
           count(distinct e.visitor)::int as visitors
    from generate_series(${since}::date, (now() at time zone 'utc')::date, interval '1 day') d
    left join analytics_events e
      on e.kind = 'view' and (e.created_at at time zone 'utc')::date = d::date
    group by d order by d`);

  const pages = await rows<{ path: string; views: number; visitors: number }>(sql`
    select target as path, count(*)::int as views, count(distinct visitor)::int as visitors
    from analytics_events where kind = 'view' and ${inRange}
    group by target order by views desc, path limit 15`);

  const referrers = await rows<{ host: string; visits: number }>(sql`
    select referrer as host, count(*)::int as visits
    from analytics_events where kind = 'view' and referrer is not null and ${inRange}
    group by referrer order by visits desc, host limit 10`);

  const outlets = await rows<{ name: string; clicks: number }>(sql`
    select coalesce(o.name, substring(e.target from '://(?:www\\.)?([^/:]+)')) as name, count(*)::int as clicks
    from analytics_events e
    left join articles a on a.url = e.target
    left join outlets o on o.id = a.outlet_id
    where e.kind = 'out' and e.created_at >= ${since}::date
    group by 1 order by clicks desc, name limit 10`);

  const stories = await rows<{ id: number | null; title: string; clicks: number }>(sql`
    select s.id, coalesce(s.title, a.title, e.target) as title, count(*)::int as clicks
    from analytics_events e
    left join articles a on a.url = e.target
    left join stories s on s.id = a.story_id
    where e.kind = 'out' and e.created_at >= ${since}::date
    group by s.id, 2 order by clicks desc, title limit 10`);

  const devices = await rows<{ device: string; visitors: number }>(sql`
    select device, count(distinct visitor)::int as visitors
    from analytics_events where kind = 'view' and ${inRange}
    group by device order by visitors desc`);

  return {
    views: totals?.views ?? 0,
    visitors: totals?.visitors ?? 0,
    clicks: totals?.clicks ?? 0,
    daily,
    pages,
    referrers,
    outlets,
    stories,
    devices,
  };
}
