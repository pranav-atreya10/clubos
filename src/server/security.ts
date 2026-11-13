"use server";

import { cookies, headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { getDb, schema } from "@/db";
import { completeMfa, pendingUser, sessionUser, startSession } from "./auth";
import { hashBackupCode, newBackupCodes, newTotpSecret, otpauthUrl, verifyTotp } from "./totp";
import { DEMO_USER_COOKIE } from "./session";

type Ok<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const CHALLENGE_COOKIE = "clubos-webauthn";

/** Passkeys are tied to the website's domain, taken from the request. */
async function rp() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  return { rpID: host.split(":")[0], origin: `${proto}://${host}` };
}

async function setChallenge(challenge: string) {
  (await cookies()).set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true, sameSite: "strict", path: "/", maxAge: 300, secure: process.env.NODE_ENV === "production",
  });
}
async function takeChallenge() {
  const jar = await cookies();
  const c = jar.get(CHALLENGE_COOKIE)?.value ?? "";
  jar.delete(CHALLENGE_COOKIE);
  return c;
}

/** Officers and advisors (in any club) must keep at least one second step. */
async function isLeader(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: schema.members.id })
    .from(schema.members)
    .where(and(eq(schema.members.userId, userId), inArray(schema.members.role, ["admin", "advisor"])))
    .limit(1);
  return Boolean(row);
}

async function me() {
  const jar = await cookies();
  if (jar.get(DEMO_USER_COOKIE)) return null; // demo people have no security settings
  return sessionUser();
}

/* ---------- overview ---------- */

export async function getSecurity(): Promise<
  Ok<{ totpEnabled: boolean; backupCodesLeft: number; required: boolean; passkeys: { id: string; name: string; createdAt: string; lastUsedAt: string | null }[] }>
> {
  const user = await me();
  if (!user) return { ok: false, error: "Please sign in" };
  const db = await getDb();
  const pks = await db.select().from(schema.passkeys).where(eq(schema.passkeys.userId, user.id));
  return {
    ok: true,
    totpEnabled: user.totpEnabled,
    backupCodesLeft: user.backupCodes.length,
    required: await isLeader(user.id),
    passkeys: pks.map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt.toISOString(), lastUsedAt: p.lastUsedAt?.toISOString() ?? null })),
  };
}

/* ---------- authenticator app (TOTP) ---------- */

export async function beginTotp(): Promise<Ok<{ secret: string; url: string }>> {
  const user = await me();
  if (!user) return { ok: false, error: "Please sign in" };
  if (user.totpEnabled) return { ok: false, error: "Your authenticator app is already set up." };
  const secret = newTotpSecret();
  const db = await getDb();
  await db.update(schema.users).set({ totpSecret: secret }).where(eq(schema.users.id, user.id));
  return { ok: true, secret, url: otpauthUrl(secret, user.loginEmail ?? user.name) };
}

export async function confirmTotp(code: string): Promise<Ok<{ codes: string[] }>> {
  const user = await me();
  if (!user) return { ok: false, error: "Please sign in" };
  if (!user.totpSecret || !verifyTotp(user.totpSecret, String(code ?? ""))) return { ok: false, error: "That code didn't match. Try the newest one in your app." };
  const { codes, hashes } = newBackupCodes();
  const db = await getDb();
  await db.update(schema.users).set({ totpEnabled: true, backupCodes: hashes }).where(eq(schema.users.id, user.id));
  return { ok: true, codes };
}

export async function disableTotp(code: string): Promise<Ok> {
  const user = await me();
  if (!user) return { ok: false, error: "Please sign in" };
  if (!user.totpEnabled || !user.totpSecret) return { ok: false, error: "It isn't turned on." };
  if (!verifyTotp(user.totpSecret, String(code ?? ""))) return { ok: false, error: "That code didn't match." };
  const db = await getDb();
  const [pk] = await db.select({ id: schema.passkeys.id }).from(schema.passkeys).where(eq(schema.passkeys.userId, user.id)).limit(1);
  if (!pk && (await isLeader(user.id))) return { ok: false, error: "Officers and advisors need at least one. Add a passkey first." };
  await db.update(schema.users).set({ totpEnabled: false, totpSecret: null, backupCodes: [] }).where(eq(schema.users.id, user.id));
  return { ok: true };
}

export async function regenerateBackupCodes(code: string): Promise<Ok<{ codes: string[] }>> {
  const user = await me();
  if (!user?.totpEnabled || !user.totpSecret) return { ok: false, error: "Turn on the authenticator app first." };
  if (!verifyTotp(user.totpSecret, String(code ?? ""))) return { ok: false, error: "That code didn't match." };
  const { codes, hashes } = newBackupCodes();
  const db = await getDb();
  await db.update(schema.users).set({ backupCodes: hashes }).where(eq(schema.users.id, user.id));
  return { ok: true, codes };
}

/* ---------- passkeys ---------- */

export async function passkeyRegisterOptions() {
  const user = await me();
  if (!user) return { ok: false as const, error: "Please sign in" };
  const db = await getDb();
  const existing = await db.select().from(schema.passkeys).where(eq(schema.passkeys.userId, user.id));
  const { rpID } = await rp();
  const options = await generateRegistrationOptions({
    rpName: "ClubOS",
    rpID,
    userName: user.loginEmail ?? user.id,
    userDisplayName: user.name,
    userID: new Uint8Array(Buffer.from(user.id)),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports as never })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  await setChallenge(options.challenge);
  return { ok: true as const, options };
}

export async function passkeyRegisterVerify(response: RegistrationResponseJSON, name: string): Promise<Ok> {
  const user = await me();
  if (!user) return { ok: false, error: "Please sign in" };
  try {
    const { rpID, origin } = await rp();
    const v = await verifyRegistrationResponse({ response, expectedChallenge: await takeChallenge(), expectedOrigin: origin, expectedRPID: rpID });
    if (!v.verified) return { ok: false, error: "Couldn't verify that passkey." };
    const c = v.registrationInfo.credential;
    const db = await getDb();
    await db.insert(schema.passkeys).values({
      id: c.id,
      userId: user.id,
      publicKey: Buffer.from(c.publicKey).toString("base64url"),
      counter: c.counter,
      transports: c.transports ?? [],
      name: String(name ?? "").trim().slice(0, 60) || "Passkey",
    });
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Couldn't add that passkey. Please try again." };
  }
}

export async function removePasskey(id: string): Promise<Ok> {
  const user = await me();
  if (!user) return { ok: false, error: "Please sign in" };
  const db = await getDb();
  const mine = await db.select({ id: schema.passkeys.id }).from(schema.passkeys).where(eq(schema.passkeys.userId, user.id));
  if (!mine.some((p) => p.id === id)) return { ok: false, error: "Passkey not found" };
  if (mine.length === 1 && !user.totpEnabled && (await isLeader(user.id))) {
    return { ok: false, error: "Officers and advisors need at least one. Set up an authenticator app first." };
  }
  await db.delete(schema.passkeys).where(and(eq(schema.passkeys.id, id), eq(schema.passkeys.userId, user.id)));
  return { ok: true };
}

/** Passkey sign-in: either the whole sign-in (no password), or the second step after a password. */
export async function passkeyLoginOptions() {
  const { rpID } = await rp();
  const pending = await pendingUser();
  const db = await getDb();
  const allow = pending ? await db.select().from(schema.passkeys).where(eq(schema.passkeys.userId, pending.id)) : [];
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: allow.map((p) => ({ id: p.id, transports: p.transports as never })),
  });
  await setChallenge(options.challenge);
  return { ok: true as const, options };
}

export async function passkeyLoginVerify(response: AuthenticationResponseJSON): Promise<Ok> {
  try {
    const db = await getDb();
    const [pk] = await db.select().from(schema.passkeys).where(eq(schema.passkeys.id, String(response?.id ?? "")));
    if (!pk) return { ok: false, error: "That passkey isn't registered with ClubOS." };
    const { rpID, origin } = await rp();
    const v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: await takeChallenge(),
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: { id: pk.id, publicKey: new Uint8Array(Buffer.from(pk.publicKey, "base64url")), counter: pk.counter, transports: pk.transports as never },
    });
    if (!v.verified) return { ok: false, error: "Couldn't verify that passkey." };
    await db.update(schema.passkeys).set({ counter: v.authenticationInfo.newCounter, lastUsedAt: new Date() }).where(eq(schema.passkeys.id, pk.id));
    const pending = await pendingUser();
    if (pending && pending.id !== pk.userId) return { ok: false, error: "That passkey belongs to a different account." };
    (await cookies()).delete(DEMO_USER_COOKIE);
    if (pending) await completeMfa(pk.userId);
    else await startSession(pk.userId);
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Couldn't sign in with that passkey." };
  }
}

/* ---------- second step after the password ---------- */

/** Accepts an authenticator code or a backup code. */
export async function verifySecondStep(code: string): Promise<Ok> {
  const user = await pendingUser();
  if (!user) return { ok: false, error: "Your sign-in timed out. Please start again." };
  const db = await getDb();
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return { ok: false, error: "Too many tries. Wait 5 minutes and try again." };
  const raw = String(code ?? "").trim();
  let good = Boolean(user.totpEnabled && user.totpSecret && verifyTotp(user.totpSecret, raw));
  if (!good && raw.replace(/\s/g, "").length > 6) {
    const h = hashBackupCode(raw);
    if (user.backupCodes.includes(h)) {
      good = true;
      await db.update(schema.users).set({ backupCodes: user.backupCodes.filter((x) => x !== h) }).where(eq(schema.users.id, user.id));
    }
  }
  if (!good) {
    const tries = user.failedLogins + 1;
    await db
      .update(schema.users)
      .set(tries >= 5 ? { failedLogins: 0, lockedUntil: new Date(Date.now() + 5 * 60_000) } : { failedLogins: tries })
      .where(eq(schema.users.id, user.id));
    return { ok: false, error: "That code didn't work." };
  }
  await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, user.id));
  await completeMfa(user.id);
  return { ok: true };
}

export async function secondStepInfo(): Promise<Ok<{ totp: boolean; passkey: boolean; name: string }>> {
  const user = await pendingUser();
  if (!user) return { ok: false, error: "expired" };
  const db = await getDb();
  const [pk] = await db.select({ id: schema.passkeys.id }).from(schema.passkeys).where(eq(schema.passkeys.userId, user.id)).limit(1);
  return { ok: true, totp: user.totpEnabled, passkey: Boolean(pk), name: user.name.split(" ")[0] };
}

/* ---------- profile ---------- */

export async function updateProfile(name: string): Promise<Ok> {
  const user = await me();
  if (!user) return { ok: false, error: "Please sign in" };
  const clean = String(name ?? "").trim();
  if (!clean || clean.length > 80) return { ok: false, error: "Please enter your name." };
  const db = await getDb();
  await db.update(schema.users).set({ name: clean }).where(eq(schema.users.id, user.id));
  // Your name in every club you're in.
  await db.update(schema.members).set({ name: clean }).where(eq(schema.members.userId, user.id));
  return { ok: true };
}

/** Profile picture as a small data URL (the browser shrinks it to 256px first), or null to remove. */
export async function setAvatar(dataUrl: string | null): Promise<Ok> {
  const user = await me();
  if (!user) return { ok: false, error: "Please sign in" };
  if (dataUrl !== null) {
    if (typeof dataUrl !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) return { ok: false, error: "That isn't a picture." };
    if (dataUrl.length > 300_000) return { ok: false, error: "That picture is too big." };
  }
  const db = await getDb();
  await db.update(schema.users).set({ avatar: dataUrl }).where(eq(schema.users.id, user.id));
  return { ok: true };
}

