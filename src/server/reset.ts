"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { hashPassword } from "./auth";
import { requireMember } from "./club";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const smtpReady = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

async function origin() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  return `${proto}://${host}`;
}

async function newResetLink(userId: string, hours: number) {
  const token = randomBytes(32).toString("base64url");
  const db = await getDb();
  await db.insert(schema.passwordResets).values({ id: hash(token), userId, expiresAt: new Date(Date.now() + hours * 3600_000) });
  return `${await origin()}/reset-password?token=${token}`;
}

export async function emailResetAvailable() {
  return smtpReady();
}

/** "Forgot password?" — emails a 1-hour link. Same answer whether or not the email has an account. */
export async function requestPasswordReset(email: string) {
  const done = { ok: true as const };
  if (!smtpReady()) return { ok: false as const, error: "Email isn't set up yet. Ask an officer for a reset link." };
  const clean = String(email ?? "").trim().toLowerCase();
  if (!clean || clean.length > 200) return done;
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.loginEmail, clean));
  if (!user) return done;
  // At most 3 live links per hour, so this can't be used to flood someone's inbox.
  const live = await db
    .select({ id: schema.passwordResets.id })
    .from(schema.passwordResets)
    .where(and(eq(schema.passwordResets.userId, user.id), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())));
  if (live.length >= 3) return done;
  const link = await newResetLink(user.id, 1);
  try {
    const nodemailer = (await import("nodemailer")).default;
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: (process.env.SMTP_PORT ?? "465") === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await t.sendMail({
      from: process.env.SMTP_FROM ?? `ClubOS <${process.env.SMTP_USER}>`,
      to: clean,
      subject: "Reset your ClubOS password",
      text: `Hi ${user.name.split(" ")[0]},\n\nUse this link to choose a new ClubOS password. It works once and expires in 1 hour:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
  } catch (e) {
    console.error("reset email failed", e);
  }
  return done;
}

/** Officers/advisors make a 24-hour reset link for a member who forgot their password. */
export async function makeResetLink(clubId: string, memberId: string) {
  try {
    const { db } = await requireMember(clubId, ["admin", "advisor"]);
    const [m] = await db.select().from(schema.members).where(and(eq(schema.members.clubId, clubId), eq(schema.members.id, String(memberId))));
    if (!m?.userId) return { ok: false as const, error: "They haven't made an account yet." };
    // Leaders protect their own accounts with 2FA and backup codes; links are for members only.
    if (m.role !== "member") return { ok: false as const, error: "Officers and advisors reset with “Forgot password?” or their backup codes." };
    return { ok: true as const, link: await newResetLink(m.userId, 24) };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Couldn't make a link." };
  }
}

export async function resetPassword(token: string, password: string) {
  const pw = String(password ?? "");
  if (pw.length < 8) return { ok: false as const, error: "Use at least 8 characters." };
  if (pw.length > 200) return { ok: false as const, error: "That password is too long." };
  const db = await getDb();
  const [r] = await db.select().from(schema.passwordResets).where(eq(schema.passwordResets.id, hash(String(token ?? ""))));
  if (!r || r.usedAt || r.expiresAt.getTime() < Date.now()) return { ok: false as const, error: "This link has expired or was already used. Ask for a new one." };
  await db.update(schema.passwordResets).set({ usedAt: new Date() }).where(eq(schema.passwordResets.id, r.id));
  await db.update(schema.users).set({ passwordHash: await hashPassword(pw), failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, r.userId));
  // Sign out everywhere: anyone using the old password is kicked out.
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, r.userId));
  return { ok: true as const };
}
