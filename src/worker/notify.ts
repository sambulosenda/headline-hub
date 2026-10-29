import { and, eq, gt, inArray, or } from "drizzle-orm";
import { closeDb, getDb } from "../db/client";
import { alertsSent, emailSettings, userPreferences, users } from "../db/schema";
import { sendEmail } from "../lib/email";
import { parseMutes } from "../lib/mutes";
import { BREAKING, DIGEST_SIZE, digestDue, isBreaking, MAX_ALERTS_PER_DAY, renderAlert, renderDigest } from "../lib/notify";
import { getTopStories } from "../lib/queries";
import { siteUrl } from "../lib/site";

type Db = ReturnType<typeof getDb>;

/** Sends due daily digests and any new breaking-news alerts, each filtered by the reader's mutes. */
export async function runOnce(db: Db, now = new Date()) {
  const hour = Number(process.env.DIGEST_HOUR ?? 7);
  const site = siteUrl();
  const readers = await db
    .select({
      userId: users.id,
      email: users.email,
      digest: emailSettings.digest,
      alerts: emailSettings.alerts,
      token: emailSettings.unsubscribeToken,
      lastDigestAt: emailSettings.lastDigestAt,
      mutes: userPreferences.mutes,
    })
    .from(emailSettings)
    .innerJoin(users, eq(users.id, emailSettings.userId))
    .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
    .where(or(eq(emailSettings.digest, true), eq(emailSettings.alerts, true)));

  let digests = 0;
  let alerts = 0;
  for (const r of readers) {
    const mutes = parseMutes(r.mutes ? JSON.stringify(r.mutes) : null);
    const links = { site, unsubscribeUrl: new URL(`/unsubscribe?token=${r.token}`, site).toString() };
    try {
      if (r.digest && digestDue(r.lastDigestAt, now, hour)) {
        const top = (await getTopStories({ hours: 24, mutes }, DIGEST_SIZE)).filter((s) => s.coverage.length > 0);
        // Mark first: a crash after this skips one digest rather than repeating it.
        await db.update(emailSettings).set({ lastDigestAt: now }).where(eq(emailSettings.userId, r.userId));
        if (top.length > 0) {
          await sendEmail(renderDigest(r.email, top, links));
          digests++;
        }
      }

      if (r.alerts) {
        const dayAgo = new Date(now.getTime() - 24 * 3_600_000);
        const sentToday = await db.$count(alertsSent, and(eq(alertsSent.userId, r.userId), gt(alertsSent.sentAt, dayAgo)));
        if (sentToday >= MAX_ALERTS_PER_DAY) continue;
        const breaking = (await getTopStories({ hours: BREAKING.maxAgeHours, developing: true, mutes }, 20)).filter(
          (s) => s.coverage.length > 0 && isBreaking(s, now),
        );
        if (breaking.length === 0) continue;
        const already = new Set(
          (
            await db
              .select({ storyId: alertsSent.storyId })
              .from(alertsSent)
              .where(and(eq(alertsSent.userId, r.userId), inArray(alertsSent.storyId, breaking.map((s) => s.id))))
          ).map((a) => a.storyId),
        );
        for (const story of breaking.filter((s) => !already.has(s.id)).slice(0, MAX_ALERTS_PER_DAY - sentToday)) {
          // Recorded before sending so a story is never alerted twice, even if two workers overlap.
          const claimed = await db
            .insert(alertsSent)
            .values({ userId: r.userId, storyId: story.id, sentAt: now })
            .onConflictDoNothing()
            .returning({ storyId: alertsSent.storyId });
          if (claimed.length === 0) continue;
          await sendEmail(renderAlert(r.email, story, links));
          alerts++;
        }
      }
    } catch (err) {
      console.error(`[notify] failed for user ${r.userId}`, err);
    }
  }
  console.log(`[notify] readers=${readers.length} digests=${digests} alerts=${alerts}`);
}

async function main() {
  const db = getDb();
  const watch = process.argv.includes("--watch");
  do {
    try {
      await runOnce(db);
    } catch (err) {
      console.error("[notify] run failed", err);
      if (!watch) process.exitCode = 1;
    }
    if (watch) await new Promise((r) => setTimeout(r, 5 * 60_000));
  } while (watch);
  await closeDb();
}

if (process.argv[1]?.endsWith("notify.ts")) {
  void main();
}
