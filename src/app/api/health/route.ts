import { sql } from "drizzle-orm";
import { getDb, usingEmbeddedDb } from "@/db";

export const dynamic = "force-dynamic";

/** Says whether the database is reachable. Never shows connection details. */
export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: usingEmbeddedDb ? "built-in (demo)" : "connected" });
  } catch (e) {
    console.error("health check failed", e);
    return Response.json({ ok: false, database: "not connected" }, { status: 503 });
  }
}
