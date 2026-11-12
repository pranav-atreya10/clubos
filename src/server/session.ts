import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { clerkEnabled } from "@/lib/clerk";

export const DEMO_USER_COOKIE = "clubos-demo-user";
export const CLUB_COOKIE = "clubos-club";

export const DEMO_USERS = [
  { id: "demo-officer", name: "Dev Mehta", email: "dev@school.edu", label: "Officer" },
  { id: "demo-advisor", name: "Mr. Anderson", email: "anderson@school.edu", label: "Advisor" },
  { id: "demo-member", name: "Maya Chen", email: "maya@school.edu", label: "Member" },
] as const;

export type Viewer = { userId: string; name: string; email: string | null; demo: boolean };

/** Who is making this request. Returns null when signed out (Clerk mode only). */
export async function getViewer(): Promise<Viewer | null> {
  if (clerkEnabled) {
    const { currentUser } = await import("@clerk/nextjs/server");
    const u = await currentUser();
    if (!u) return null;
    const name = u.fullName || u.username || u.primaryEmailAddress?.emailAddress?.split("@")[0] || "New member";
    const viewer: Viewer = { userId: u.id, name, email: u.primaryEmailAddress?.emailAddress ?? null, demo: false };
    await upsertUser(viewer);
    return viewer;
  }
  const jar = await cookies();
  const pick = DEMO_USERS.find((d) => d.id === jar.get(DEMO_USER_COOKIE)?.value) ?? DEMO_USERS[0];
  const viewer: Viewer = { userId: pick.id, name: pick.name, email: pick.email, demo: true };
  await upsertUser(viewer);
  return viewer;
}

async function upsertUser(v: Viewer) {
  const db = await getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, v.userId));
  if (!existing) {
    await db.insert(schema.users).values({ id: v.userId, name: v.name, email: v.email }).onConflictDoNothing();
  } else if (existing.name !== v.name || existing.email !== v.email) {
    await db.update(schema.users).set({ name: v.name, email: v.email }).where(eq(schema.users.id, v.userId));
  }
}

export async function getActiveClubCookie() {
  return (await cookies()).get(CLUB_COOKIE)?.value ?? null;
}
