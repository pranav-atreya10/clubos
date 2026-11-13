import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

export const SESSION_COOKIE = "clubos-session";
const SESSION_DAYS = 30;
const KEY_LEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Turns a password into a one-way hash. Format: scrypt$N$r$p$salt$hash */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEY_LEN, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, N, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scryptAsync(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Used when an email doesn't exist, so "wrong email" and "wrong password" take the same time. */
let dummyHash: Promise<string> | null = null;
export const burnTime = async (password: string) => {
  dummyHash ??= hashPassword("not-a-real-password");
  await verifyPassword(password, await dummyHash);
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/**
 * Signs this browser in as `userId`. With `mfaPending`, the password was right but the
 * second step (2FA code or passkey) still has to happen; such a session can't use the app.
 */
export async function startSession(userId: string, { mfaPending = false } = {}) {
  const token = randomBytes(32).toString("base64url");
  const db = await getDb();
  await db.insert(schema.sessions).values({
    id: hashToken(token),
    userId,
    mfaPending,
    // Half-finished sign-ins expire after 10 minutes.
    expiresAt: new Date(Date.now() + (mfaPending ? 10 * 60_000 : SESSION_DAYS * 86400_000)),
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(mfaPending ? 600 : SESSION_DAYS * 86400));
}

/** The signed-in user for this browser, or null (also null while the 2FA step is unfinished). */
export async function sessionUser() {
  const row = await currentSession();
  return row && !row.session.mfaPending ? row.user : null;
}

/** The user who typed the right password but hasn't done the second step yet. */
export async function pendingUser() {
  const row = await currentSession();
  return row?.session.mfaPending ? row.user : null;
}

/** Finishes a sign-in after the second step: replaces the pending session with a full one. */
export async function completeMfa(userId: string) {
  await endSession();
  await startSession(userId);
}

async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const id = hashToken(token);
  const [row] = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, id));
  if (!row) return null;
  if (row.session.expiresAt.getTime() < Date.now()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  // Refresh once it's past halfway, so people who use it stay signed in.
  if (!row.session.mfaPending && row.session.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * 86400_000) {
    await db.update(schema.sessions).set({ expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000) }).where(eq(schema.sessions.id, id));
  }
  return row;
}

/** Whether this person has a second step set up (authenticator app or at least one passkey). */
export async function hasSecondFactor(userId: string) {
  const db = await getDb();
  const [u] = await db.select({ totp: schema.users.totpEnabled }).from(schema.users).where(eq(schema.users.id, userId));
  if (u?.totp) return true;
  const [pk] = await db.select({ id: schema.passkeys.id }).from(schema.passkeys).where(eq(schema.passkeys.userId, userId)).limit(1);
  return Boolean(pk);
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}
