"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { burnTime, endSession, hashPassword, startSession, verifyPassword } from "./auth";
import { CLUB_COOKIE, DEMO_USERS, DEMO_USER_COOKIE } from "./session";
import { newId } from "./ids";

export type AuthResult = { ok: true } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TRIES = 5;
const LOCK_MINUTES = 5;

const str = (v: unknown) => (typeof v === "string" ? v : "");

async function leaveDemo() {
  const jar = await cookies();
  jar.delete(DEMO_USER_COOKIE);
  jar.delete(CLUB_COOKIE);
}

export async function signUp(input: { name: string; email: string; password: string }): Promise<AuthResult> {
  try {
    const name = str(input?.name).trim();
    const email = str(input?.email).trim().toLowerCase();
    const password = str(input?.password);
    if (!name || name.length > 80) return { ok: false, error: "Please enter your name." };
    if (!EMAIL.test(email) || email.length > 200) return { ok: false, error: "That email doesn't look right." };
    if (password.length < 8) return { ok: false, error: "Use at least 8 characters for your password." };
    if (password.length > 200) return { ok: false, error: "That password is too long." };

    const db = await getDb();
    const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.loginEmail, email));
    if (taken) return { ok: false, error: "There's already an account with that email. Try signing in." };

    const id = newId();
    await db.insert(schema.users).values({ id, name, email, loginEmail: email, passwordHash: await hashPassword(password) });
    await leaveDemo();
    await startSession(id);
    return { ok: true };
  } catch (e) {
    // Two people signing up with the same email at the same moment.
    if (String(e).includes("users_login_email")) return { ok: false, error: "There's already an account with that email. Try signing in." };
    console.error(e);
    return { ok: false, error: "Couldn't create your account. Please try again." };
  }
}

export async function signIn(input: { email: string; password: string }): Promise<AuthResult> {
  try {
    const email = str(input?.email).trim().toLowerCase();
    const password = str(input?.password);
    const wrong = { ok: false as const, error: "Wrong email or password." };
    if (!email || !password || password.length > 200) return wrong;

    const db = await getDb();
    const [user] = await db.select().from(schema.users).where(eq(schema.users.loginEmail, email));
    if (!user?.passwordHash) {
      await burnTime(password);
      return wrong;
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return { ok: false, error: `Too many tries. Wait ${LOCK_MINUTES} minutes and try again.` };
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      const tries = user.failedLogins + 1;
      await db
        .update(schema.users)
        .set(tries >= MAX_TRIES ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedLogins: tries })
        .where(eq(schema.users.id, user.id));
      return tries >= MAX_TRIES ? { ok: false, error: `Too many tries. Wait ${LOCK_MINUTES} minutes and try again.` } : wrong;
    }
    if (user.failedLogins || user.lockedUntil) {
      await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, user.id));
    }
    await leaveDemo();
    await startSession(user.id);
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Couldn't sign you in. Please try again." };
  }
}

export async function signOut(): Promise<AuthResult> {
  await endSession();
  await leaveDemo();
  return { ok: true };
}

/** Start trying the demo as one of the sample people. Doesn't touch any real account. */
export async function enterDemo(userId: string): Promise<AuthResult> {
  const pick = DEMO_USERS.find((d) => d.id === userId) ?? DEMO_USERS[0];
  const jar = await cookies();
  jar.set(DEMO_USER_COOKIE, pick.id, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 });
  jar.delete(CLUB_COOKIE);
  return { ok: true };
}

export async function exitDemo(): Promise<AuthResult> {
  await leaveDemo();
  return { ok: true };
}
