import { asc, eq, gt, sql } from "drizzle-orm";
import { closeDb, getDb } from "../db/client";
import { articles } from "../db/schema";
import { tagCountries } from "../lib/countries";
import { storyCountries, syncConfig } from "./ingest";

/**
 * Re-tags every article with the countries it's about, then rolls them up to
 * stories. Run once after adding the countries migration, and again whenever
 * the country list or its terms change. Ingest tags new articles itself.
 */
async function main() {
  const db = getDb();
  // Outlet home countries come from the outlets table, so bring it up to date first.
  await syncConfig(db);
  let lastId = 0;
  let changed = 0;
  for (;;) {
    const batch = await db
      .select({ id: articles.id, title: articles.title, summary: articles.summary, countries: articles.countries })
      .from(articles)
      .where(gt(articles.id, lastId))
      .orderBy(asc(articles.id))
      .limit(1000);
    if (batch.length === 0) break;
    for (const a of batch) {
      const countries = tagCountries(a.title, a.summary);
      if (countries.join() !== a.countries.join()) {
        await db.update(articles).set({ countries }).where(eq(articles.id, a.id));
        changed++;
      }
    }
    lastId = batch[batch.length - 1].id;
  }
  await db.execute(sql`update stories s set countries = ${storyCountries(sql`s.id`)}`);
  console.log(`[tag-countries] articles_changed=${changed}`);
  await closeDb();
}

void main();
