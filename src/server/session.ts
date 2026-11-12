import "server-only";
import { cookies } from "next/headers";
import { getDb, schema } from "@/db";
import { sessionUser } from "./auth";

/** Set only while someone is trying the demo (from /demo). */
export const DEMO_USER_COOKIE = "clubos-demo-user";
export const CLUB_COOKIE = "clubos-club";

export const DEMO_USERS = [
  { id: "demo-officer", name: "Dev Mehta", email: "dev@school.edu", label: "Officer" },
  { id: "demo-advisor", name: "Mr. Anderson", email: "anderson@school.edu", label: "Advisor" },
  { id: "demo-member", name: "Maya Chen", email: "maya@school.edu", label: "Member" },
] as const;

export type Viewer = { userId: string; name: string; email: string | null; demo: boolean };

/** Who is making this request: a demo visitor, a signed-in account, or nobody (null). */
export async function getViewer(): Promise<Viewer | null> {
  const jar = await cookies();
  const demo = DEMO_USERS.find((d) => d.id === jar.get(DEMO_USER_COOKIE)?.value);
  if (demo) {
    await ensureDemoUsers();
    return { userId: demo.id, name: demo.name, email: demo.email, demo: true };
  }
  const user = await sessionUser();
  if (!user) return null;
  return { userId: user.id, name: user.name, email: user.loginEmail ?? user.email, demo: false };
}

let demoUsersReady = false;
async function ensureDemoUsers() {
  if (demoUsersReady) return;
  const db = await getDb();
  await db.insert(schema.users).values(DEMO_USERS.map((u) => ({ id: u.id, name: u.name, email: u.email }))).onConflictDoNothing();
  demoUsersReady = true;
}

export async function getActiveClubCookie() {
  return (await cookies()).get(CLUB_COOKIE)?.value ?? null;
}
