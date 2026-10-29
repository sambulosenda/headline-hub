import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { db?: Db; sql?: postgres.Sql };

/** One pooled connection per process, reused across hot reloads in dev. */
export function getDb(): Db {
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
