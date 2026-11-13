import "server-only";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "@/db";
import type { ClubData, ClubSettings, HistoryEntry, Member, Role, Snapshot } from "@/lib/types";
import { addDays, fromISODate, startOfWeek, toISODate } from "@/lib/dates";
import { ALL_ON } from "@/lib/features";
import { ensureDemoClub } from "./demo-seed";
import { getActiveClubCookie, getViewer, type Viewer } from "./session";
import { newId } from "./ids";
import { hasSecondFactor } from "./auth";

export type ClubRow = typeof schema.clubs.$inferSelect;
export type MemberRow = typeof schema.members.$inferSelect;

export class NotAllowed extends Error {}

/** "Mr. Anderson", "Mr. Anderson or Ms. Lee", or "your advisor" when there's no advisor yet. */
export const advisorNameOf = (members: Pick<MemberRow, "role" | "name">[]) => {
  const names = members.filter((m) => m.role === "advisor").map((m) => m.name);
  return names.length ? names.join(" or ") : "your advisor";
};

export async function advisorNameFor(db: DB, clubId: string) {
  const rows = await db.select({ role: schema.members.role, name: schema.members.name }).from(schema.members).where(eq(schema.members.clubId, clubId));
  return advisorNameOf(rows);
}

export const settingsOf = (c: ClubRow, advisorName = "your advisor"): ClubSettings => ({
  clubName: c.name,
  advisorName,
  wiredDays: c.wiredDays,
  advisorEmail: "",
  wiredEmail: c.wiredEmail,
  attendanceUrl: c.attendanceUrl,
  meetingDay: c.meetingDay,
  meetingTime: c.meetingTime,
  meetingRoom: c.meetingRoom,
  wiredTemplate: c.wiredTemplate,
  features: { ...ALL_ON, ...c.features },
});

/**
 * Keeps AM Wired slots planned about two weeks ahead, each covering `days` days.
 * Daily (1) slots skip weekends, since there are no morning announcements then.
 */
export async function ensureUpcomingSlots(db: DB, clubId: string, days: number) {
  const len = Math.min(Math.max(Math.round(days) || 1, 1), 31);
  const today = new Date(new Date().toDateString());
  const horizon = addDays(today, 14);
  const [last] = await db
    .select({ weekOf: schema.wiredWeeks.weekOf, endDate: schema.wiredWeeks.endDate })
    .from(schema.wiredWeeks)
    .where(eq(schema.wiredWeeks.clubId, clubId))
    .orderBy(desc(schema.wiredWeeks.weekOf))
    .limit(1);

  let next = last ? addDays(fromISODate(last.endDate ?? last.weekOf), 1) : len === 7 ? startOfWeek(today) : today;
  if (next < today) next = len === 7 ? startOfWeek(today) : today;

  const rows: (typeof schema.wiredWeeks.$inferInsert)[] = [];
  while (next <= horizon && rows.length < 20) {
    if (len === 1) while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1);
    const end = addDays(next, len - 1);
    rows.push({ id: newId(), clubId, weekOf: toISODate(next), endDate: toISODate(end) });
    next = addDays(end, 1);
  }
  if (rows.length) await db.insert(schema.wiredWeeks).values(rows).onConflictDoNothing();
}

const toHistory = (rows: (typeof schema.activity.$inferSelect)[]): Map<string, HistoryEntry[]> => {
  const m = new Map<string, HistoryEntry[]>();
  for (const r of rows) {
    const list = m.get(r.entityId) ?? [];
    list.push({ at: r.at.toISOString(), by: r.by, action: r.action, ...(r.kind === "rating" ? { kind: "rating" as const, prev: r.prev } : {}) });
    m.set(r.entityId, list);
  }
  return m;
};

/** Loads one club for one person, keeping only what their role may see. */
export async function loadClub(db: DB, club: ClubRow, me: MemberRow): Promise<ClubData> {
  const role = me.role as Role;
  const leader = role === "admin" || role === "advisor";
  if (leader) await ensureUpcomingSlots(db, club.id, club.wiredDays);

  const recent = toISODate(addDays(new Date(), -14));
  const [members, events, wired, announcements, tasks, resources, activity] = await Promise.all([
    db.select().from(schema.members).where(eq(schema.members.clubId, club.id)).orderBy(asc(schema.members.name)),
    db.select().from(schema.events).where(eq(schema.events.clubId, club.id)).orderBy(asc(schema.events.date)),
    leader
      ? db.select().from(schema.wiredWeeks).where(and(eq(schema.wiredWeeks.clubId, club.id), gte(schema.wiredWeeks.weekOf, recent))).orderBy(asc(schema.wiredWeeks.weekOf)).limit(40)
      : Promise.resolve([]),
    db.select().from(schema.announcements).where(eq(schema.announcements.clubId, club.id)).orderBy(desc(schema.announcements.date), desc(schema.announcements.createdAt)),
    db
      .select()
      .from(schema.tasks)
      .where(role === "member" ? and(eq(schema.tasks.clubId, club.id), eq(schema.tasks.assigneeId, me.id)) : eq(schema.tasks.clubId, club.id))
      .orderBy(asc(schema.tasks.due)),
    db.select().from(schema.resources).where(eq(schema.resources.clubId, club.id)).orderBy(desc(schema.resources.date), desc(schema.resources.createdAt)),
    db
      .select()
      .from(schema.activity)
      .where(
        and(
          eq(schema.activity.clubId, club.id),
          inArray(schema.activity.entityType, leader ? ["wired", "task", "rating"] : ["task"]),
        ),
      )
      .orderBy(asc(schema.activity.at)),
  ]);

  const hist = toHistory(activity);
  // Profile pictures: send a versioned URL, not the image, so the 20-second refresh stays small.
  const userIds = members.map((m) => m.userId).filter((x): x is string => Boolean(x));
  const pics = userIds.length
    ? await db
        .select({ id: schema.users.id, v: sql<string | null>`left(md5(${schema.users.avatar}), 10)` })
        .from(schema.users)
        .where(inArray(schema.users.id, userIds))
    : [];
  const picOf = new Map(pics.filter((p) => p.v).map((p) => [p.id, `/api/avatar/${p.id}?v=${p.v}`]));

  const shapeMember = (m: MemberRow): Member => ({
    id: m.id,
    name: m.name,
    // Members don't get each other's emails or any rating data.
    email: leader || m.id === me.id ? m.email : "",
    grade: m.grade as Member["grade"],
    title: m.title,
    role: m.role as Role,
    isOfficer: m.role === "admin",
    hasAccount: Boolean(m.userId),
    avatar: m.userId ? (picOf.get(m.userId) ?? null) : null,
    joined: m.joined,
    rating: leader ? m.rating : null,
    ratingNote: leader ? m.ratingNote : "",
    boardCandidate: leader ? m.boardCandidate : false,
    ratingHistory: leader ? (hist.get(m.id) ?? []) : [],
  });

  return {
    id: club.id,
    role,
    meId: me.id,
    inviteCode: role === "admin" ? club.inviteCode : null,
    // Members don't need the AM Wired setup (template, email).
    settings: leader ? settingsOf(club, advisorNameOf(members)) : { ...settingsOf(club, advisorNameOf(members)), wiredTemplate: "", wiredEmail: "" },
    members: members.map(shapeMember),
    events: events.map((e) => ({ id: e.id, title: e.title, date: e.date, time: e.time, location: e.location, type: e.type, notes: e.notes })),
    wired: wired.map((w) => ({
      id: w.id,
      weekOf: w.weekOf,
      endDate: w.endDate,
      status: w.status,
      message: w.message,
      advisorNote: w.advisorNote,
      updatedAt: w.updatedAt.toISOString(),
      history: hist.get(w.id) ?? [],
    })),
    announcements: announcements.map((a) => ({ id: a.id, title: a.title, body: a.body, date: a.date, author: a.author, pinned: a.pinned })),
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, assigneeId: t.assigneeId ?? "", due: t.due, status: t.status, history: hist.get(t.id) ?? [] })),
    resources: resources
      .filter((r) => leader || r.category !== "Officers")
      .map((r) => ({ id: r.id, title: r.title, kind: r.kind, url: r.url, category: r.category, addedBy: r.addedBy, date: r.date })),
  };
}

/** Everything the signed-in person needs: their clubs, and the active club's data. */
export async function loadSnapshot(viewer: Viewer, preferClubId?: string | null): Promise<Snapshot> {
  const db = await getDb();
  if (viewer.demo) await ensureDemoClub(db);

  const memberships = await db
    .select({ member: schema.members, club: schema.clubs })
    .from(schema.members)
    .innerJoin(schema.clubs, eq(schema.members.clubId, schema.clubs.id))
    .where(eq(schema.members.userId, viewer.userId))
    .orderBy(asc(schema.clubs.name));

  const clubs = memberships.map((m) => ({ id: m.club.id, name: m.club.name, role: m.member.role as Role }));
  const wanted = preferClubId ?? (await getActiveClubCookie());
  const active = memberships.find((m) => m.club.id === wanted) ?? memberships[0];

  const isLeader = memberships.some((m) => m.member.role === "admin" || m.member.role === "advisor");
  const [u] = await db.select({ v: sql<string | null>`left(md5(${schema.users.avatar}), 10)` }).from(schema.users).where(eq(schema.users.id, viewer.userId));
  return {
    viewer: {
      userId: viewer.userId,
      name: viewer.name,
      demo: viewer.demo,
      avatar: u?.v ? `/api/avatar/${viewer.userId}?v=${u.v}` : null,
      needsSecurity: !viewer.demo && isLeader && !(await hasSecondFactor(viewer.userId)),
    },
    clubs,
    club: active ? await loadClub(db, active.club, active.member) : null,
  };
}

/**
 * Checks that the person calling is in this club with one of the allowed roles.
 * Every server action starts with this.
 */
export async function requireMember(clubId: unknown, roles: Role[] = ["admin", "advisor", "member"]) {
  if (typeof clubId !== "string") throw new NotAllowed("Missing club");
  const viewer = await getViewer();
  if (!viewer) throw new NotAllowed("Please sign in");
  const db = await getDb();
  const [row] = await db
    .select({ member: schema.members, club: schema.clubs })
    .from(schema.members)
    .innerJoin(schema.clubs, eq(schema.members.clubId, schema.clubs.id))
    .where(and(eq(schema.members.clubId, clubId), eq(schema.members.userId, viewer.userId)));
  if (!row) throw new NotAllowed("You're not in this club");
  if (!roles.includes(row.member.role as Role)) throw new NotAllowed("Your account can't do that");
  // Officers and advisors must have a passkey or authenticator app before doing anything as a leader.
  if ((row.member.role === "admin" || row.member.role === "advisor") && !viewer.demo && !(await hasSecondFactor(viewer.userId))) {
    throw new NotAllowed("Set up a passkey or authenticator app first (Profile → Security).");
  }
  return { db, viewer, me: row.member, club: row.club };
}
