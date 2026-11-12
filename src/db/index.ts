import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * One database for the whole app.
 * - DATABASE_URL set (Supabase, Neon, any Postgres): connects to it.
 * - Not set: runs an embedded Postgres (PGlite) saved in ./.data — great for the demo and local dev.
 * Tables are created/updated automatically from ./drizzle on first use.
 */
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as unknown as { __clubosDb?: Promise<DB> };

async function connect(): Promise<DB> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const url = databaseUrl();

  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const postgres = (await import("postgres")).default;
    // Links from Supabase's Vercel integration carry extra settings (?sslmode=…&supa=…)
    // that aren't real Postgres options; turn them into plain connection settings.
    const parsed = new URL(url);
    const ssl = parsed.searchParams.get("sslmode") === "require" || parsed.hostname.endsWith("supabase.com") ? "require" : undefined;
    parsed.search = "";
    // prepare:false keeps Supabase's connection pooler (port 6543) happy.
    const client = postgres(parsed.toString(), { prepare: false, max: 5, ...(ssl ? { ssl } : {}) });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });
    return db;
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL isn't set. Add your Supabase (or other Postgres) connection string to the server's environment variables.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db;
}

export function getDb(): Promise<DB> {
  if (!g.__clubosDb) {
    g.__clubosDb = connect().catch((e) => {
      g.__clubosDb = undefined;
      throw e;
    });
  }
  return g.__clubosDb;
}

/**
 * POSTGRES_URL is set (and kept correct) automatically by Supabase's Vercel integration,
 * so it wins over a hand-typed DATABASE_URL.
 */
function databaseUrl() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
}

export const usingEmbeddedDb = !databaseUrl();
export { schema };
