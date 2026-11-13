import { randomBytes, randomUUID } from "node:crypto";

export const newId = () => randomUUID();

/** Short, easy-to-type invite code without look-alike characters (no 0/O, 1/I/L). */
export const newInviteCode = () => {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};
