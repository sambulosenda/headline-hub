import { AsyncLocalStorage } from "node:async_hooks";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { db?: Db; sql?: postgres.Sql };

/** True inside a Cloudflare Worker (workerd), false under Node. */
const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/**
 * Workers may not reuse a connection across requests, so there each request
 * gets its own small client on top of Hyperdrive, which does the real pooling.
 * Keyed by the request's ExecutionContext so a long-lived stream reuses its own.
 */
const perRequest = new WeakMap<object, Db>();

function workersDb(): Db {
  const { env, ctx } = getCloudflareContext();
  let db = perRequest.get(ctx);
  if (!db) {
    const hyperdrive = (env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE;
    const url = hyperdrive?.connectionString ?? process.env.DATABASE_URL;
    if (!url) throw new Error("No HYPERDRIVE binding or DATABASE_URL on this Worker.");
    // Hyperdrive's guidance for postgres.js: a few connections, and skip the type lookup round trip.
    db = drizzle(postgres(url, { max: 5, fetch_types: false }), { schema });
    perRequest.set(ctx, db);
  }
  return db;
}

/** A database a standalone Worker (cloudflare/ingest) sets for one invocation; see withDb. */
const scoped = new AsyncLocalStorage<Db>();

/** Run `fn` with getDb() returning a fresh client on `url`, and close it afterwards. */
export async function withDb<T>(url: string, fn: (db: Db) => Promise<T>): Promise<T> {
  const sql = postgres(url, { max: 5, fetch_types: false });
  const db = drizzle(sql, { schema });
  try {
    return await scoped.run(db, () => fn(db));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** One pooled connection per process (reused across hot reloads in dev), or one client per request on Workers. */
export function getDb(): Db {
  const inScope = scoped.getStore();
  if (inScope) return inScope;
  if (onWorkers) return workersDb();
  if (globalForDb.db) return globalForDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  const sql = postgres(url, { max: 10 });
  globalForDb.sql = sql;
  globalForDb.db = drizzle(sql, { schema });
  return globalForDb.db;
}

export async function closeDb() {
  await globalForDb.sql?.end();
  globalForDb.sql = undefined;
  globalForDb.db = undefined;
}
