import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Authenticator-app codes (RFC 6238): 6 digits, 30-second steps, SHA-1 — what every authenticator app uses. */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function newTotpSecret() {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32ToBytes(s: string) {
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) {
    const v = ALPHABET.indexOf(c);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}

export function totpCode(secret: string, step = Math.floor(Date.now() / 30_000)) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", base32ToBytes(secret)).update(counter).digest();
  const offset = h[h.length - 1] & 0xf;
  const n = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/** Accepts the current code, or one step either side (phone clocks drift). */
export function verifyTotp(secret: string, code: string) {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((d) => {
    const expected = Buffer.from(totpCode(secret, now + d));
    return timingSafeEqual(expected, Buffer.from(clean));
  });
}

export const otpauthUrl = (secret: string, account: string) =>
  `otpauth://totp/${encodeURIComponent(`ClubOS:${account}`)}?secret=${secret}&issuer=ClubOS&algorithm=SHA1&digits=6&period=30`;

/** 10 one-time backup codes like "k7qm-2xpa". Returns the codes to show once, and their hashes to store. */
export function newBackupCodes() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const codes = Array.from({ length: 10 }, () => {
    const b = randomBytes(8);
    const s = Array.from(b, (x) => alphabet[x % alphabet.length]).join("");
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
  return { codes, hashes: codes.map(hashBackupCode) };
}

export const hashBackupCode = (code: string) => createHash("sha256").update(code.trim().toLowerCase().replace(/\s/g, "")).digest("hex");
