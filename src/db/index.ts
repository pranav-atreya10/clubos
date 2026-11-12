import "server-only";
import { mkdirSync, readFileSync } from "node:fs";
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
    // Supabase's transaction pooler (6543) can stall multi-step saves. The same pooler's
    // session mode (5432) behaves like a normal Postgres connection, so use that.
    if (parsed.hostname.endsWith("pooler.supabase.com") && parsed.port === "6543") parsed.port = "5432";
    const client = postgres(parsed.toString(), {
      prepare: false,
      max: 3,
      idle_timeout: 20, // give pooler slots back quickly between requests
      connect_timeout: 10,
      onnotice: () => {}, // "already exists, skipping" notices aren't useful in logs
      ...(ssl ? { ssl } : {}),
    });
    const db = drizzle(client, { schema });
    // Only run migrations when the database is behind (saves work on every cold start).
    const expected = (JSON.parse(readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8")) as { entries: unknown[] }).entries.length;
    const applied = await client`select count(*)::int as n from drizzle.__drizzle_migrations`.then((r) => Number(r[0]?.n ?? 0)).catch(() => 0);
    if (applied < expected) await migrate(db, { migrationsFolder });
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

const CONNECT_TIMEOUT_MS = 20_000;

export function getDb(): Promise<DB> {
  if (!g.__clubosDb) {
    // Never let a stuck connection hang every request on this server: give up and retry next time.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database took too long to connect")), CONNECT_TIMEOUT_MS).unref?.(),
    );
    g.__clubosDb = Promise.race([connect(), timeout]).catch((e) => {
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
