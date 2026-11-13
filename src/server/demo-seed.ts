import "server-only";
import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { schema } from "@/db";
import { ALL_ON } from "@/lib/features";
import {
  seedAnnouncements,
  seedEvents,
  seedMembers,
  seedResources,
  seedSettings,
  seedTasks,
  seedWired,
} from "@/lib/seed";
import { newId } from "./ids";
import { DEMO_USERS } from "./session";

export const DEMO_CLUB_ID = "demo-club";

/** Which demo login is linked to which sample member. */
const LINKS: Record<string, string> = { u3: "demo-officer", u4: "demo-member" };

/** Creates the sample club (only in demo mode, only once). `reset` wipes and recreates it. */
export async function ensureDemoClub(db: DB, { reset = false } = {}) {
  if (reset) await db.delete(schema.clubs).where(eq(schema.clubs.id, DEMO_CLUB_ID));
  const [exists] = await db.select({ id: schema.clubs.id, createdAt: schema.clubs.createdAt }).from(schema.clubs).where(eq(schema.clubs.id, DEMO_CLUB_ID));
  if (exists) {
    // Anyone can edit the demo, so start it fresh once a day (dates also stay current).
    if (Date.now() - exists.createdAt.getTime() < 24 * 3600_000) return;
    await db.delete(schema.clubs).where(eq(schema.clubs.id, DEMO_CLUB_ID));
  }

  const st = seedSettings();
  const clubId = DEMO_CLUB_ID;
  const mid = (id: string) => `demo-${id}`;

  try {
    await createDemoClub(db, st, clubId, mid);
  } catch (e) {
    // Two visitors arrived at the same moment and the other request already created it.
    const [now] = await db.select({ id: schema.clubs.id }).from(schema.clubs).where(eq(schema.clubs.id, DEMO_CLUB_ID));
    if (!now) throw e;
  }
}

async function createDemoClub(db: DB, st: ReturnType<typeof seedSettings>, clubId: string, mid: (id: string) => string) {
  await db.transaction(async (tx) => {
    // The three demo logins need to exist before club members can point at them.
    await tx
      .insert(schema.users)
      .values(DEMO_USERS.map((u) => ({ id: u.id, name: u.name, email: u.email })))
      .onConflictDoNothing();
    await tx.insert(schema.clubs).values({
      id: clubId,
      name: st.clubName,
      inviteCode: "VELOCITY",
      advisorInviteCode: "VELOCITYADVISOR",
      wiredEmail: st.wiredEmail,
      attendanceUrl: st.attendanceUrl,
      meetingDay: st.meetingDay,
      meetingTime: st.meetingTime,
      meetingRoom: st.meetingRoom,
      wiredTemplate: st.wiredTemplate,
      wiredDays: 7,
      features: { ...ALL_ON },
    });

    const members = seedMembers();
    await tx.insert(schema.members).values([
      ...members.map((m) => ({
        id: mid(m.id),
        clubId,
        userId: LINKS[m.id] ?? null,
        name: m.name,
        email: m.email,
        grade: m.grade,
        role: m.role,
        title: m.title,
        joined: m.joined,
        rating: m.rating,
        ratingNote: m.ratingNote,
        boardCandidate: m.boardCandidate,
      })),
      {
        id: mid("advisor"),
        clubId,
        userId: "demo-advisor",
        name: "Mr. Anderson",
        email: st.advisorEmail,
        grade: 12,
        role: "advisor" as const,
        title: "Advisor",
        joined: members[0].joined,
      },
    ]);

    const history: (typeof schema.activity.$inferInsert)[] = [];
    for (const m of members)
      for (const h of m.ratingHistory)
        history.push({ id: newId(), clubId, entityType: "rating", entityId: mid(m.id), at: new Date(h.at), by: h.by, action: h.action, kind: h.kind ?? null, prev: h.prev ?? null });

    await tx.insert(schema.events).values(seedEvents().map((e) => ({ ...e, id: mid(e.id), clubId })));

    const weeks = seedWired(st.wiredTemplate);
    await tx.insert(schema.wiredWeeks).values(
      weeks.map((w) => ({ id: mid(w.id), clubId, weekOf: w.weekOf, endDate: w.endDate, status: w.status, message: w.message, advisorNote: w.advisorNote, updatedAt: new Date(w.updatedAt) })),
    );
    for (const w of weeks)
      for (const h of w.history)
        history.push({ id: newId(), clubId, entityType: "wired", entityId: mid(w.id), at: new Date(h.at), by: h.by, action: h.action });

    await tx.insert(schema.announcements).values(seedAnnouncements().map((a) => ({ ...a, id: mid(a.id), clubId })));

    const tasks = seedTasks();
    await tx.insert(schema.tasks).values(
      tasks.map((t) => ({ id: mid(t.id), clubId, title: t.title, assigneeId: mid(t.assigneeId), due: t.due, status: t.status })),
    );
    for (const t of tasks)
      for (const h of t.history)
        history.push({ id: newId(), clubId, entityType: "task", entityId: mid(t.id), at: new Date(h.at), by: h.by, action: h.action });

    await tx.insert(schema.resources).values(seedResources().map((r) => ({ ...r, id: mid(r.id), clubId })));
    if (history.length) await tx.insert(schema.activity).values(history);
  });
}
