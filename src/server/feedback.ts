"use server";

import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getViewer } from "./session";
import { newId } from "./ids";

/** The app owner(s): comma-separated login emails in the OWNER_EMAILS environment variable. */
async function isOwner() {
  const v = await getViewer();
  const owners = (process.env.OWNER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return Boolean(v && !v.demo && v.email && owners.includes(v.email.toLowerCase()));
}

export async function amOwner() {
  return isOwner();
}

export async function sendFeedback(input: { message: string; page?: string; club?: string }) {
  const v = await getViewer();
  if (!v || v.demo) return { ok: false as const, error: "Please sign in to send feedback." };
  const message = String(input?.message ?? "").trim();
  if (!message) return { ok: false as const, error: "Write something first." };
  if (message.length > 4000) return { ok: false as const, error: "That's too long." };
  const db = await getDb();
  await db.insert(schema.feedback).values({
    id: newId(),
    userId: v.userId,
    name: v.name,
    email: v.email,
    club: String(input?.club ?? "").slice(0, 120) || null,
    page: String(input?.page ?? "").slice(0, 200) || null,
    message,
  });
  return { ok: true as const };
}

export async function listFeedback() {
  if (!(await isOwner())) return { ok: false as const, error: "Not found" };
  const db = await getDb();
  const rows = await db.select().from(schema.feedback).orderBy(desc(schema.feedback.createdAt)).limit(300);
  return { ok: true as const, items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) };
}

export async function markFeedback(id: string, done: boolean) {
  if (!(await isOwner())) return { ok: false as const };
  const db = await getDb();
  await db.update(schema.feedback).set({ done: Boolean(done) }).where(eq(schema.feedback.id, String(id)));
  return { ok: true as const };
}
