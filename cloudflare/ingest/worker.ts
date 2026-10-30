/**
 * The feed reader and email sender as a Cloudflare Worker, replacing the
 * always-on `ingest:watch` and `notify:watch` loops:
 *
 * - every minute: queue each site's due feeds, then rescore stories
 * - queue consumer: fetch, parse, embed (Workers AI) and store one site's feeds
 * - every 5 minutes: digests and breaking-news alerts
 * - every 15 minutes: sync outlets and feeds from config
 */
import { inArray } from "drizzle-orm";
import { withDb } from "../../src/db/client";
import { feeds } from "../../src/db/schema";
import { embeddingsEnabled } from "../../src/lib/embeddings";
import { byHost, candidatesFromDb, dueFeedRows, ingestFeed, refreshDerived, syncConfig } from "../../src/worker/ingest";
import { runOnce as notify } from "../../src/worker/notify";
import { workersAiEmbedder } from "./embed";

interface Env {
  HYPERDRIVE: { connectionString: string };
  AI: { run(model: string, input: { text: string[] }): Promise<unknown> };
  FEEDS: { sendBatch(messages: { body: SiteJob }[]): Promise<void> };
}

// Just the parts of the Workers runtime types used here, so the Next.js tsconfig needn't load them all.
interface ScheduledController {
  cron: string;
  scheduledTime: number;
}
interface MessageBatch<T> {
  messages: { body: T; ack(): void }[];
}

/** One publisher's due feeds, fetched one after another so no site sees parallel requests. */
interface SiteJob {
  urls: string[];
}

async function enqueueDueFeeds(env: Env, db: Parameters<typeof dueFeedRows>[0], now: Date) {
  const due = await dueFeedRows(db, now);
  if (due.length === 0) return 0;
  // Claim them now so the next minute's run doesn't queue them again while they wait.
  await db.update(feeds).set({ lastFetchedAt: now }).where(inArray(feeds.url, due.map((f) => f.url)));
  const jobs = byHost(due).map((group) => ({ body: { urls: group.map((f) => f.url) } }));
  for (let i = 0; i < jobs.length; i += 100) await env.FEEDS.sendBatch(jobs.slice(i, i + 100));
  return jobs.length;
}

const worker = {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const now = new Date(controller.scheduledTime);
    await withDb(env.HYPERDRIVE.connectionString, async (db) => {
      switch (controller.cron) {
        case "* * * * *": {
          const sites = await enqueueDueFeeds(env, db, now);
          const { rescored, names } = await refreshDerived(db, now, sites);
          console.log(`[ingest] queued_sites=${sites} stories_rescored=${rescored} names=${names}`);
          break;
        }
        case "*/5 * * * *":
          await notify(db, now);
          break;
        case "*/15 * * * *":
          await syncConfig(db);
          break;
      }
    });
  },

  async queue(batch: MessageBatch<SiteJob>, env: Env): Promise<void> {
    const embed = embeddingsEnabled() ? workersAiEmbedder(env.AI) : null;
    await withDb(env.HYPERDRIVE.connectionString, async (db) => {
      const candidates = candidatesFromDb(db, new Date());
      let added = 0;
      let failed = 0;
      for (const message of batch.messages) {
        const rows = await db.select().from(feeds).where(inArray(feeds.url, message.body.urls));
        for (const feed of rows) {
          const result = await ingestFeed(db, feed, candidates, embed);
          added += result.added;
          if (result.failed) failed++;
        }
        message.ack();
      }
      console.log(`[ingest] sites=${batch.messages.length} failed_feeds=${failed} new_articles=${added} embeddings=${embed ? "on" : "off"}`);
    });
  },
};

export default worker;

