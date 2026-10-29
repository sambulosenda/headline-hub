import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "hh_session";
/** A sign-in link works once, for this long. */
export const LINK_TTL_MS = 15 * 60_000;
/** At most this many links per email address per hour. */
export const LINKS_PER_HOUR = 5;
export const SESSION_TTL_MS = 30 * 24 * 3_600_000;

/** A random, URL-safe secret. Only its hash is ever stored. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Lower-cased, trimmed address if it looks deliverable, otherwise null. */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Reads one cookie from a raw Cookie header, for route handlers that stream. */
export function readCookie(header: string | null, name: string): string | undefined {
  const pair = header
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (pair === undefined) return undefined;
  try {
    return decodeURIComponent(pair);
  } catch {
    return undefined;
  }
}
