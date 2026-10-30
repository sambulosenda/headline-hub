import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { parseFeed } from "./feeds";
import { isAllowed, USER_AGENT } from "./robots";

export type CheckStatus = "pass" | "warn" | "fail";

export interface FeedCheck {
  name: string;
  status: CheckStatus;
  detail: string;
}

export interface FeedVetting {
  checks: FeedCheck[];
  /** True when nothing failed; warnings are left to the reviewer. */
  ok: boolean;
  sampleTitles: string[];
}

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const STALE_DAYS = 7;
const MIN_ITEMS = 3;

/** Private, loopback, link-local and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/** Feeds are fetched by our server, so refuse anything that points inside the network. */
async function assertPublic(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("must be an http or https URL");
  if (process.env.ALLOW_PRIVATE_FEEDS === "1") return;
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("must use the standard port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("must be a public website");
  }
}

/** GET with redirects followed by hand, so every hop is checked, and a size cap. */
async function safeGet(raw: string): Promise<{ status: number; text: string; url: URL }> {
  let url = new URL(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) throw new Error("response is too large");
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new Error("response is too large");
    return { status: res.status, text, url };
  }
  throw new Error("too many redirects");
}

/** Last two labels of a hostname, near enough to "same site" for a reviewer hint. */
function siteOf(hostname: string) {
  if (isIP(hostname.replace(/^\[|\]$/g, ""))) return hostname;
  return hostname.replace(/^www\./, "").split(".").slice(-2).join(".");
}

/** Automatic checks run on every submitted feed before a person looks at it. */
export async function vetFeed(feedUrl: string, homepage: string, now = new Date()): Promise<FeedVetting> {
  const checks: FeedCheck[] = [];
  const done = (sampleTitles: string[] = []): FeedVetting => ({
    checks,
    ok: checks.every((c) => c.status !== "fail"),
    sampleTitles,
  });

  let url: URL;
  try {
    url = new URL(feedUrl);
    await assertPublic(url);
    checks.push({ name: "Address", status: "pass", detail: url.hostname });
  } catch (err) {
    checks.push({ name: "Address", status: "fail", detail: err instanceof Error ? err.message : "not a valid URL" });
    return done();
  }

  try {
    const home = new URL(homepage);
    const same = siteOf(home.hostname) === siteOf(url.hostname);
    checks.push({
      name: "Same site as homepage",
      status: same ? "pass" : "warn",
      detail: same ? siteOf(url.hostname) : `feed is on ${url.hostname}, homepage on ${home.hostname}`,
    });
  } catch {
    checks.push({ name: "Same site as homepage", status: "warn", detail: "homepage is not a valid URL" });
  }

  try {
    const robots = await safeGet(`${url.origin}/robots.txt`)
      .then((r) => (r.status === 200 ? r.text : ""))
      .catch(() => "");
    const allowed = isAllowed(robots, url.pathname + url.search);
    checks.push({
      name: "robots.txt",
      status: allowed ? "pass" : "fail",
      detail: allowed ? "our crawler is allowed" : "the site's robots.txt blocks our crawler",
    });
    if (!allowed) return done();
  } catch {
    checks.push({ name: "robots.txt", status: "warn", detail: "couldn't read robots.txt" });
  }

  let items;
  try {
    const res = await safeGet(url.toString());
    if (res.status !== 200) {
      checks.push({ name: "Feed loads", status: "fail", detail: `HTTP ${res.status}` });
      return done();
    }
    checks.push({ name: "Feed loads", status: "pass", detail: "HTTP 200" });
    items = await parseFeed(res.text, now);
  } catch (err) {
    checks.push({ name: "Feed loads", status: "fail", detail: err instanceof Error ? err.message : String(err) });
    return done();
  }

  checks.push({
    name: "Has articles",
    status: items.length >= MIN_ITEMS ? "pass" : "fail",
    detail: `${items.length} item${items.length === 1 ? "" : "s"}`,
  });

  const newest = Math.max(0, ...items.map((i) => i.publishedAt?.getTime() ?? 0));
  if (!newest) {
    checks.push({ name: "Recently updated", status: "warn", detail: "items have no dates" });
  } else {
    const days = (now.getTime() - newest) / 86_400_000;
    checks.push({
      name: "Recently updated",
      status: days <= STALE_DAYS ? "pass" : "fail",
      detail: days < 1 ? `newest item ${Math.max(0, Math.round(days * 24))}h old` : `newest item ${days.toFixed(1)} days old`,
    });
  }

  return done(items.slice(0, 5).map((i) => i.title));
}
