import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/db/client";
import { loginTokens, sessions, userPreferences, users } from "@/db/schema";
import { sendEmail } from "./email";
import { mergeMutes, MUTES_COOKIE, NO_MUTES, parseMutes, serializeMutes, type Mutes } from "./mutes";
import { siteUrl, SITE_NAME } from "./site";
import {
  hashToken,
  LINK_TTL_MS,
  LINKS_PER_HOUR,
  newToken,
  normalizeEmail,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "./tokens";

export interface SessionUser {
  id: number;
  email: string;
}

export type SignInRequest = { ok: true; email: string } | { ok: false; error: string };

/** Emails a one-time sign-in link, or prints it when no email service is set up. */
export async function requestSignIn(rawEmail: string): Promise<SignInRequest> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "That doesn't look like an email address." };

  const db = getDb();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const [recent] = await db
    .select({ n: count() })
    .from(loginTokens)
    .where(and(eq(loginTokens.email, email), sql`${loginTokens.createdAt} > ${hourAgo}::timestamptz`));
  if ((recent?.n ?? 0) >= LINKS_PER_HOUR) {
    return { ok: false, error: "Too many sign-in links for that address. Try again in an hour." };
  }

  const token = newToken();
  await db.insert(loginTokens).values({
    tokenHash: hashToken(token),
    email,
    expiresAt: new Date(Date.now() + LINK_TTL_MS),
  });

  const link = new URL("/auth/verify", siteUrl());
  link.searchParams.set("token", token);
  await sendLink(email, link.toString());
  return { ok: true, email };
}

async function sendLink(email: string, link: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    // Kept in this exact form: the README tells people to grep the dev log for it.
    console.log(`[auth] sign-in link for ${email}: ${link}`);
    return;
  }
  await sendEmail({
    to: email,
    subject: `Sign in to ${SITE_NAME}`,
    text: `Sign in to ${SITE_NAME}:\n\n${link}\n\nThe link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.`,
    html: `<p><a href="${link}">Sign in to ${SITE_NAME}</a></p><p>The link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.</p>`,
  });
}

/**
 * Spends a sign-in link: creates the account if needed, starts a session, and
 * moves this browser's mutes onto the account. False if the link is used,
 * expired or unknown.
 */
export async function consumeSignIn(token: string): Promise<boolean> {
  const db = getDb();
  const [spent] = await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(loginTokens.tokenHash, hashToken(token)),
        isNull(loginTokens.usedAt),
        sql`${loginTokens.expiresAt} > now()`,
      ),
    )
    .returning({ email: loginTokens.email });
  if (!spent) return false;

  const [user] = await db
    .insert(users)
    .values({ email: spent.email })
    .onConflictDoUpdate({ target: users.email, set: { email: spent.email } })
    .returning({ id: users.id });

  const sessionToken = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ tokenHash: hashToken(sessionToken), userId: user.id, expiresAt });

  const jar = await cookies();
  const browserMutes = parseMutes(jar.get(MUTES_COOKIE)?.value);
  const merged = mergeMutes(await loadPreferences(user.id), browserMutes);
  await savePreferences(user.id, merged);

  jar.set(SESSION_COOKIE, sessionToken, {
    path: "/",
    expires: expiresAt,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  // The account is now the source of truth; a stale copy here would creep back in on the next sign-in.
  jar.delete(MUTES_COOKIE);
  return true;
}

/** The user a raw session token belongs to, if the session is still live. */
export async function userForSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [row] = await getDb()
    .select({ id: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);
  return row ?? null;
}

/** The signed-in reader for this request, read once per render. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return userForSession((await cookies()).get(SESSION_COOKIE)?.value);
});

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

export async function loadPreferences(userId: number): Promise<Mutes> {
  const [row] = await getDb()
    .select({ mutes: userPreferences.mutes })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));
  // Stored values are re-validated like the cookie, so a removed outlet just drops out.
  return row ? parseMutes(JSON.stringify(row.mutes)) : NO_MUTES;
}

export async function savePreferences(userId: number, mutes: Mutes) {
  const value = JSON.parse(serializeMutes(mutes));
  await getDb()
    .insert(userPreferences)
    .values({ userId, mutes: value })
    .onConflictDoUpdate({ target: userPreferences.userId, set: { mutes: value, updatedAt: new Date() } });
}
