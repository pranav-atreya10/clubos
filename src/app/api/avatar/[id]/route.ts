import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getViewer } from "@/server/session";

/** Profile pictures, only for people who are signed in (or trying the demo). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getViewer())) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  const db = await getDb();
  const [u] = await db.select({ avatar: schema.users.avatar }).from(schema.users).where(eq(schema.users.id, id));
  const m = u?.avatar?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      // The URL changes whenever the picture does, so it can be cached for a long time.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
