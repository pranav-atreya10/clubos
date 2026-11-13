"use server";

import { cookies } from "next/headers";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "@/db";
import type { Role, Snapshot, TaskStatus } from "@/lib/types";
import { FEATURES, type FeatureKey } from "@/lib/features";
import { DEFAULT_TEMPLATE } from "@/lib/seed";
import { buildDraft } from "@/lib/wired";
import { addDays, fromISODate, startOfWeek, toISODate } from "@/lib/dates";
import { ensureDemoClub } from "./demo-seed";
import { NotAllowed, advisorNameFor, loadSnapshot, requireMember, settingsOf } from "./club";
import { CLUB_COOKIE, DEMO_USERS, DEMO_USER_COOKIE, getViewer } from "./session";
import { newId, newInviteCode } from "./ids";
import { ALL_ON } from "@/lib/features";

export type Result = { ok: true; snapshot: Snapshot } | { ok: false; error: string };

class Invalid extends Error {}

const ACTION_TIMEOUT_MS = 25_000;

async function run(fn: () => Promise<Snapshot>): Promise<Result> {
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timed out")), ACTION_TIMEOUT_MS));
    return { ok: true, snapshot: await Promise.race([fn(), timeout]) };
  } catch (e) {
    if (e instanceof NotAllowed || e instanceof Invalid) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong saving that. Please try again." };
  }
}

/* ---------- input checks (actions can be called directly, so never trust input) ---------- */

const text = (v: unknown, max: number, { required = false } = {}) => {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new Invalid("Invalid input");
  const s = v.trim();
  if (required && !s) throw new Invalid("Please fill that in");
  if (s.length > max) throw new Invalid(`That's too long (max ${max} characters)`);
  return s;
};
const raw = (v: unknown, max: number) => {
  if (typeof v !== "string") throw new Invalid("Invalid input");
  if (v.length > max) throw new Invalid(`That's too long (max ${max} characters)`);
  return v;
};
const oneOf = <T extends string>(v: unknown, opts: readonly T[]): T => {
  if (typeof v !== "string" || !opts.includes(v as T)) throw new Invalid("Invalid input");
  return v as T;
};
const isoDate = (v: unknown) => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(fromISODate(v).getTime())) throw new Invalid("Invalid date");
  return v;
};
const id = (v: unknown) => {
  if (typeof v !== "string" || !v || v.length > 64) throw new Invalid("Invalid input");
  return v;
};
const url = (v: unknown) => {
  const s = text(v, 2000, { required: true });
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
  } catch {
    throw new Invalid("Please enter a full link starting with https://");
  }
  return s;
};

const today = () => toISODate(new Date());
const snap = async (clubId: string) => loadSnapshot((await getViewer())!, clubId);

async function log(db: DB, clubId: string, entityType: "wired" | "task" | "rating", entityId: string, by: string, action: string) {
  await db.insert(schema.activity).values({ id: newId(), clubId, entityType, entityId, by, action });
}

/* ---------- loading, switching, joining ---------- */

export async function getSnapshot(): Promise<Result> {
  return run(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new NotAllowed("Please sign in");
    return loadSnapshot(viewer);
  });
}

export async function switchClub(clubId: string): Promise<Result> {
  return run(async () => {
    await requireMember(clubId);
    (await cookies()).set(CLUB_COOKIE, clubId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return snap(clubId);
  });
}

/** Demo mode only: switch between the sample officer, advisor, and member. */
export async function setDemoUser(userId: string): Promise<Result> {
  return run(async () => {
    const viewer = await getViewer();
    if (!viewer?.demo) throw new NotAllowed("Only available in the demo");
    const pick = DEMO_USERS.find((d) => d.id === userId);
    if (!pick) throw new Invalid("Unknown demo user");
    (await cookies()).set(DEMO_USER_COOKIE, pick.id, { httpOnly: true, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 });
    return loadSnapshot((await getViewer())!);
  });
}

export async function createClub(name: string): Promise<Result> {
  return run(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new NotAllowed("Please sign in");
    if (viewer.demo) throw new NotAllowed("Create an account to start your own club.");
    const clubName = text(name, 80, { required: true });
    const db = await getDb();
    const clubId = newId();
    await db.transaction(async (tx) => {
      await tx.insert(schema.clubs).values({
        id: clubId, name: clubName, inviteCode: newInviteCode(), advisorInviteCode: newInviteCode(), wiredTemplate: DEFAULT_TEMPLATE, features: { ...ALL_ON },
      });
      await tx.insert(schema.members).values({
        id: newId(), clubId, userId: viewer.userId, name: viewer.name, email: viewer.email ?? "", role: "admin", title: "President", joined: today(),
      });
    });
    (await cookies()).set(CLUB_COOKIE, clubId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return loadSnapshot(viewer, clubId);
  });
}

/** Join with an invite code. If an officer already added you by email, you're linked to that profile. */
export async function joinClub(code: string): Promise<Result> {
  return run(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new NotAllowed("Please sign in");
    if (viewer.demo) throw new NotAllowed("Create an account to join a real club.");
    const clean = text(code, 32, { required: true }).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const db = await getDb();
    const [club] = await db.select().from(schema.clubs).where(or(eq(schema.clubs.inviteCode, clean), eq(schema.clubs.advisorInviteCode, clean)));
    if (!club) throw new Invalid("That code didn't match any club. Check it with an officer.");
    const asAdvisor = club.advisorInviteCode === clean;
    const role = asAdvisor ? ("advisor" as const) : ("member" as const);
    const title = asAdvisor ? "Advisor" : "Member";

    const [already] = await db.select().from(schema.members).where(and(eq(schema.members.clubId, club.id), eq(schema.members.userId, viewer.userId)));
    if (already) {
      // A member who later gets the advisor code becomes the advisor (officers stay officers).
      if (asAdvisor && already.role === "member") await db.update(schema.members).set({ role, title }).where(eq(schema.members.id, already.id));
    } else {
      const email = viewer.email?.toLowerCase();
      const roster = email ? await db.select().from(schema.members).where(eq(schema.members.clubId, club.id)) : [];
      const match = roster.find((m) => !m.userId && m.email.toLowerCase() === email);
      if (match) {
        await db
          .update(schema.members)
          .set({ userId: viewer.userId, ...(asAdvisor && match.role === "member" ? { role, title } : {}) })
          .where(eq(schema.members.id, match.id));
      } else {
        await db.insert(schema.members).values({ id: newId(), clubId: club.id, userId: viewer.userId, name: viewer.name, email: viewer.email ?? "", role, title, joined: today() });
      }
    }
    (await cookies()).set(CLUB_COOKIE, club.id, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return loadSnapshot(viewer, club.id);
  });
}

export async function resetDemo(): Promise<Result> {
  return run(async () => {
    const viewer = await getViewer();
    if (!viewer?.demo) throw new NotAllowed("Only available in the demo");
    await ensureDemoClub(await getDb(), { reset: true });
    return loadSnapshot(viewer);
  });
}

/* ---------- settings ---------- */

const SETTING_LIMITS = {
  clubName: 80, wiredEmail: 200, attendanceUrl: 2000, meetingDay: 40, meetingTime: 40, meetingRoom: 80, wiredTemplate: 1000,
} as const;
const SETTING_COLUMNS = {
  clubName: "name", wiredEmail: "wiredEmail", attendanceUrl: "attendanceUrl",
  meetingDay: "meetingDay", meetingTime: "meetingTime", meetingRoom: "meetingRoom", wiredTemplate: "wiredTemplate",
} as const;

export async function updateSettings(clubId: string, patch: Record<string, unknown>): Promise<Result> {
  return run(async () => {
    const { db, club } = await requireMember(clubId, ["admin"]);
    const set: Partial<typeof schema.clubs.$inferInsert> = {};
    for (const [k, v] of Object.entries(patch ?? {})) {
      if (k === "wiredDays") {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 31) throw new Invalid("Pick between 1 and 31 days");
        set.wiredDays = n;
        continue;
      }
      if (!(k in SETTING_COLUMNS)) continue;
      const key = k as keyof typeof SETTING_COLUMNS;
      const value = text(v, SETTING_LIMITS[key], { required: key === "clubName" });
      (set as Record<string, string>)[SETTING_COLUMNS[key]] = value;
    }
    if (Object.keys(set).length) await db.update(schema.clubs).set(set).where(eq(schema.clubs.id, clubId));
    if (set.wiredDays !== undefined && set.wiredDays !== club.wiredDays) {
      // Re-plan future slots nobody has touched yet, so the new length applies right away.
      await db.execute(sql`
        delete from ${schema.wiredWeeks}
        where ${schema.wiredWeeks.clubId} = ${clubId}
          and ${schema.wiredWeeks.weekOf} > ${today()}
          and ${schema.wiredWeeks.status} = 'draft'
          and ${schema.wiredWeeks.message} = ''
          and not exists (select 1 from ${schema.activity} where ${schema.activity.entityType} = 'wired' and ${schema.activity.entityId} = ${schema.wiredWeeks.id})
      `);
    }
    return snap(clubId);
  });
}

export async function setFeature(clubId: string, key: FeatureKey, on: boolean): Promise<Result> {
  return run(async () => {
    const { db, club } = await requireMember(clubId, ["admin"]);
    const k = oneOf(key, FEATURES.map((f) => f.key));
    await db.update(schema.clubs).set({ features: { ...ALL_ON, ...club.features, [k]: Boolean(on) } }).where(eq(schema.clubs.id, clubId));
    return snap(clubId);
  });
}

export async function newInvite(clubId: string, kind: "member" | "advisor" = "member"): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin"]);
    const which = oneOf(kind, ["member", "advisor"] as const);
    await db
      .update(schema.clubs)
      .set(which === "advisor" ? { advisorInviteCode: newInviteCode() } : { inviteCode: newInviteCode() })
      .where(eq(schema.clubs.id, clubId));
    return snap(clubId);
  });
}

/* ---------- AM Wired ---------- */

async function week(db: DB, clubId: string, weekId: unknown) {
  const [w] = await db.select().from(schema.wiredWeeks).where(and(eq(schema.wiredWeeks.clubId, clubId), eq(schema.wiredWeeks.id, id(weekId))));
  if (!w) throw new Invalid("That week no longer exists");
  return w;
}
const setWeek = (db: DB, weekId: string, set: Partial<typeof schema.wiredWeeks.$inferInsert>) =>
  db.update(schema.wiredWeeks).set({ ...set, updatedAt: new Date() }).where(eq(schema.wiredWeeks.id, weekId));

export async function wiredEdit(clubId: string, weekId: string, message: string): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin"]);
    const w = await week(db, clubId, weekId);
    if (w.status === "pending" || w.status === "sent" || w.status === "skipped") throw new Invalid("Pull it back before editing");
    // Editing an approved or sent-back message puts it back in draft.
    await setWeek(db, w.id, { message: raw(message, 1500), status: "draft" });
    return snap(clubId);
  });
}

export async function wiredGenerate(clubId: string, weekId: string): Promise<Result> {
  return run(async () => {
    const { db, viewer, club } = await requireMember(clubId, ["admin"]);
    const w = await week(db, clubId, weekId);
    const settings = settingsOf(club);
    const evs = settings.features.calendar ? await db.select().from(schema.events).where(eq(schema.events.clubId, clubId)) : [];
    const message = buildDraft({ ...settings, advisorName: await advisorNameFor(db, clubId) }, evs.map((e) => ({ ...e })), w.weekOf, w.endDate);
    await setWeek(db, w.id, { message, status: "draft" });
    await log(db, clubId, "wired", w.id, viewer.name, settings.features.calendar ? "Auto-filled draft from calendar" : "Auto-filled draft");
    return snap(clubId);
  });
}

/** Moves a week from one status to another, if allowed, and records it. */
async function wiredMove(clubId: string, weekId: string, roles: Role[], from: string[], to: typeof schema.wiredWeeks.$inferInsert.status, action: (advisor: string) => string, extra: Partial<typeof schema.wiredWeeks.$inferInsert> = {}) {
  const { db, viewer } = await requireMember(clubId, roles);
  const w = await week(db, clubId, weekId);
  if (!from.includes(w.status)) throw new Invalid("Someone else changed this — refreshed.");
  if (to === "pending" && !w.message.trim()) throw new Invalid("Write the message first");
  await setWeek(db, w.id, { status: to, ...extra });
  await log(db, clubId, "wired", w.id, viewer.name, action(await advisorNameFor(db, clubId)));
  return snap(clubId);
}

export const wiredSubmit = async (clubId: string, weekId: string) =>
  run(() => wiredMove(clubId, weekId, ["admin"], ["draft", "changes"], "pending", (a) => `Sent to ${a} for approval`, { advisorNote: "" }));
export const wiredSkip = async (clubId: string, weekId: string) =>
  run(() => wiredMove(clubId, weekId, ["admin"], ["draft", "changes", "approved"], "skipped", () => "Skipped this week"));
export const wiredUnskip = async (clubId: string, weekId: string) =>
  run(() => wiredMove(clubId, weekId, ["admin"], ["skipped"], "draft", () => "Un-skipped"));
export const wiredRecall = async (clubId: string, weekId: string) =>
  run(() => wiredMove(clubId, weekId, ["admin"], ["pending"], "draft", () => "Pulled back to edit"));
export const wiredMarkSent = async (clubId: string, weekId: string) =>
  run(() => wiredMove(clubId, weekId, ["admin"], ["approved"], "sent", () => "Marked as sent to AM Wired"));

export async function wiredApprove(clubId: string, weekId: string, message?: string): Promise<Result> {
  const edited = typeof message === "string";
  return run(() =>
    wiredMove(clubId, weekId, ["advisor"], ["pending"], "approved", () => (edited ? "Edited and approved" : "Approved"), edited ? { message: text(message, 1500, { required: true }) } : {}),
  );
}

export async function wiredRequestChanges(clubId: string, weekId: string, note: string): Promise<Result> {
  return run(() => wiredMove(clubId, weekId, ["advisor"], ["pending"], "changes", () => "Requested changes", { advisorNote: text(note, 500, { required: true }) }));
}

export async function wiredAddWeek(clubId: string): Promise<Result> {
  return run(async () => {
    const { db, club } = await requireMember(clubId, ["admin"]);
    const len = club.wiredDays;
    const [last] = await db.select().from(schema.wiredWeeks).where(eq(schema.wiredWeeks.clubId, clubId)).orderBy(desc(schema.wiredWeeks.weekOf)).limit(1);
    let start = last ? addDays(fromISODate(last.endDate ?? last.weekOf), 1) : len === 7 ? startOfWeek(new Date()) : new Date();
    if (len === 1) while (start.getDay() === 0 || start.getDay() === 6) start = addDays(start, 1);
    await db
      .insert(schema.wiredWeeks)
      .values({ id: newId(), clubId, weekOf: toISODate(start), endDate: toISODate(addDays(start, len - 1)) })
      .onConflictDoNothing();
    return snap(clubId);
  });
}

/* ---------- announcements ---------- */

export async function addAnnouncement(clubId: string, a: { title: string; body: string; pinned: boolean }): Promise<Result> {
  return run(async () => {
    const { db, viewer } = await requireMember(clubId, ["admin", "advisor"]);
    await db.insert(schema.announcements).values({
      id: newId(), clubId, title: text(a?.title, 140, { required: true }), body: text(a?.body, 4000), pinned: Boolean(a?.pinned), date: today(), author: viewer.name,
    });
    return snap(clubId);
  });
}

export async function removeAnnouncement(clubId: string, announcementId: string): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin", "advisor"]);
    await db.delete(schema.announcements).where(and(eq(schema.announcements.clubId, clubId), eq(schema.announcements.id, id(announcementId))));
    return snap(clubId);
  });
}

export async function togglePin(clubId: string, announcementId: string): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin", "advisor"]);
    const [a] = await db.select().from(schema.announcements).where(and(eq(schema.announcements.clubId, clubId), eq(schema.announcements.id, id(announcementId))));
    if (a) await db.update(schema.announcements).set({ pinned: !a.pinned }).where(eq(schema.announcements.id, a.id));
    return snap(clubId);
  });
}

/* ---------- tasks ---------- */

const STATUS_ACTION: Record<TaskStatus, string> = { todo: "Moved back to To do", doing: "Moved to In progress", done: "Marked done" };

async function memberIn(db: DB, clubId: string, memberId: unknown) {
  const [m] = await db.select().from(schema.members).where(and(eq(schema.members.clubId, clubId), eq(schema.members.id, id(memberId))));
  if (!m) throw new Invalid("That person isn't in this club");
  return m;
}

export async function addTask(clubId: string, t: { title: string; assigneeId: string; due: string }): Promise<Result> {
  return run(async () => {
    const { db, viewer } = await requireMember(clubId, ["admin"]);
    const who = await memberIn(db, clubId, t?.assigneeId);
    const taskId = newId();
    await db.insert(schema.tasks).values({ id: taskId, clubId, title: text(t?.title, 200, { required: true }), assigneeId: who.id, due: isoDate(t?.due) });
    await log(db, clubId, "task", taskId, viewer.name, `Created and assigned to ${who.name}`);
    return snap(clubId);
  });
}

export async function setTaskStatus(clubId: string, taskId: string, status: TaskStatus): Promise<Result> {
  return run(async () => {
    const { db, viewer, me } = await requireMember(clubId, ["admin", "member"]);
    const next = oneOf(status, ["todo", "doing", "done"] as const);
    const [t] = await db.select().from(schema.tasks).where(and(eq(schema.tasks.clubId, clubId), eq(schema.tasks.id, id(taskId))));
    if (!t) throw new Invalid("That task no longer exists");
    if (me.role === "member" && t.assigneeId !== me.id) throw new NotAllowed("You can only update your own tasks");
    if (t.status !== next) {
      await db.update(schema.tasks).set({ status: next }).where(eq(schema.tasks.id, t.id));
      await log(db, clubId, "task", t.id, viewer.name, STATUS_ACTION[next]);
    }
    return snap(clubId);
  });
}

export async function removeTask(clubId: string, taskId: string): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin"]);
    await db.delete(schema.tasks).where(and(eq(schema.tasks.clubId, clubId), eq(schema.tasks.id, id(taskId))));
    await db.delete(schema.activity).where(and(eq(schema.activity.clubId, clubId), eq(schema.activity.entityId, taskId)));
    return snap(clubId);
  });
}

/* ---------- calendar ---------- */

export async function addEvent(clubId: string, e: { title: string; date: string; time: string; location: string; type: string; notes: string }): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin", "advisor"]);
    await db.insert(schema.events).values({
      id: newId(), clubId, title: text(e?.title, 140, { required: true }), date: isoDate(e?.date), time: text(e?.time, 40), location: text(e?.location, 140),
      type: oneOf(e?.type, ["meeting", "race", "event", "deadline"] as const), notes: text(e?.notes, 1000),
    });
    return snap(clubId);
  });
}

export async function removeEvent(clubId: string, eventId: string): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin", "advisor"]);
    await db.delete(schema.events).where(and(eq(schema.events.clubId, clubId), eq(schema.events.id, id(eventId))));
    return snap(clubId);
  });
}

/* ---------- members & ratings ---------- */

const MERGE_WINDOW_MS = 60_000;

export async function setRating(clubId: string, memberId: string, rating: number | null): Promise<Result> {
  return run(async () => {
    const { db, viewer } = await requireMember(clubId, ["admin", "advisor"]);
    const m = await memberIn(db, clubId, memberId);
    if (m.role === "advisor") throw new Invalid("Advisors aren't rated");
    const after = rating === null ? null : Number(rating);
    if (after !== null && (!Number.isInteger(after) || after < 1 || after > 10)) throw new Invalid("Ratings go from 1 to 10");
    if (m.rating === after) return snap(clubId);

    // Quick back-to-back changes by the same person become one history entry.
    const [last] = await db
      .select()
      .from(schema.activity)
      .where(and(eq(schema.activity.clubId, clubId), eq(schema.activity.entityType, "rating"), eq(schema.activity.entityId, m.id)))
      .orderBy(desc(schema.activity.at))
      .limit(1);
    const merge = last?.kind === "rating" && last.by === viewer.name && Date.now() - last.at.getTime() < MERGE_WINDOW_MS;
    const from = merge ? last!.prev : m.rating;

    await db.transaction(async (tx) => {
      await tx.update(schema.members).set({ rating: after }).where(eq(schema.members.id, m.id));
      if (merge) await tx.delete(schema.activity).where(eq(schema.activity.id, last!.id));
      if (!(merge && from === after)) {
        const action = after === null ? "Cleared the rating" : from === null ? `Rated ${after}/10` : `Changed rating from ${from}/10 to ${after}/10`;
        await tx.insert(schema.activity).values({ id: newId(), clubId, entityType: "rating", entityId: m.id, by: viewer.name, action, kind: "rating", prev: from });
      }
    });
    return snap(clubId);
  });
}

/** Saves the note while typing (no history entry). */
export async function setRatingNote(clubId: string, memberId: string, note: string): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin", "advisor"]);
    const m = await memberIn(db, clubId, memberId);
    await db.update(schema.members).set({ ratingNote: raw(note, 1000) }).where(eq(schema.members.id, m.id));
    return snap(clubId);
  });
}

/** Called when someone finishes editing a note: records it in the history if it changed. */
export async function logRatingNote(clubId: string, memberId: string, before: string): Promise<Result> {
  return run(async () => {
    const { db, viewer } = await requireMember(clubId, ["admin", "advisor"]);
    const m = await memberIn(db, clubId, memberId);
    if (m.ratingNote.trim() !== String(before ?? "").trim()) {
      const note = m.ratingNote.trim();
      await log(db, clubId, "rating", m.id, viewer.name, note ? `Updated note: “${note}”` : "Cleared the note");
    }
    return snap(clubId);
  });
}

export async function toggleCandidate(clubId: string, memberId: string): Promise<Result> {
  return run(async () => {
    const { db, viewer } = await requireMember(clubId, ["admin", "advisor"]);
    const m = await memberIn(db, clubId, memberId);
    await db.update(schema.members).set({ boardCandidate: !m.boardCandidate }).where(eq(schema.members.id, m.id));
    await log(db, clubId, "rating", m.id, viewer.name, m.boardCandidate ? "Removed from board candidates" : "Marked as a board candidate");
    return snap(clubId);
  });
}

export async function updateMemberTitle(clubId: string, memberId: string, title: string): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin"]);
    const m = await memberIn(db, clubId, memberId);
    await db.update(schema.members).set({ title: text(title, 60) || "Member" }).where(eq(schema.members.id, m.id));
    return snap(clubId);
  });
}

/** True if, after this change, the club still has at least one officer or advisor. */
async function keepsALeader(db: DB, clubId: string, memberId: string, newRole: Role | null) {
  const rows = await db.select({ id: schema.members.id, role: schema.members.role }).from(schema.members).where(eq(schema.members.clubId, clubId));
  return rows.some((r) => (r.id === memberId ? newRole === "admin" || newRole === "advisor" : r.role === "admin" || r.role === "advisor"));
}

export async function setMemberRole(clubId: string, memberId: string, role: Role): Promise<Result> {
  return run(async () => {
    const { db, me } = await requireMember(clubId, ["admin", "advisor"]);
    const next = oneOf(role, ["admin", "advisor", "member"] as const);
    const m = await memberIn(db, clubId, memberId);
    if (me.role === "advisor" && m.role === "advisor" && m.id !== me.id) throw new NotAllowed("Advisors can't change another advisor");
    if (!(await keepsALeader(db, clubId, m.id, next))) throw new Invalid("A club needs at least one officer or advisor. Make someone else an officer first.");
    const title = next === "advisor" ? "Advisor" : m.title === "Advisor" ? (next === "admin" ? "Officer" : "Member") : m.title === "Member" && next === "admin" ? "Officer" : next === "member" ? "Member" : m.title;
    await db.update(schema.members).set({ role: next, title }).where(eq(schema.members.id, m.id));
    return snap(clubId);
  });
}

/**
 * "Hand down": a leaving officer (or advisor) passes their role and title to someone new.
 * Their unfinished tasks go to the new person. They either stay as Alumni or leave the club.
 */
export async function handDown(clubId: string, toMemberId: string, leave: boolean): Promise<Result> {
  return run(async () => {
    const { db, viewer, me } = await requireMember(clubId, ["admin", "advisor"]);
    const to = await memberIn(db, clubId, toMemberId);
    if (to.id === me.id) throw new Invalid("Pick someone else to hand down to");
    await db.transaction(async (tx) => {
      await tx.update(schema.members).set({ role: me.role, title: me.title }).where(eq(schema.members.id, to.id));
      const open = await tx
        .select({ id: schema.tasks.id })
        .from(schema.tasks)
        .where(and(eq(schema.tasks.clubId, clubId), eq(schema.tasks.assigneeId, me.id), sql`${schema.tasks.status} <> 'done'`));
      for (const t of open) {
        await tx.update(schema.tasks).set({ assigneeId: to.id }).where(eq(schema.tasks.id, t.id));
        await tx.insert(schema.activity).values({ id: newId(), clubId, entityType: "task", entityId: t.id, by: viewer.name, action: `Handed down to ${to.name}` });
      }
      if (leave) await tx.delete(schema.members).where(eq(schema.members.id, me.id));
      else await tx.update(schema.members).set({ role: "member", title: "Alumni" }).where(eq(schema.members.id, me.id));
    });
    if (leave) {
      (await cookies()).delete(CLUB_COOKIE);
      return loadSnapshot(viewer);
    }
    return snap(clubId);
  });
}

export async function addMember(clubId: string, p: { name: string; email: string; grade: number }): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin"]);
    const grade = Number(p?.grade);
    if (![9, 10, 11, 12].includes(grade)) throw new Invalid("Pick a grade");
    const email = text(p?.email, 200).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Invalid("That email doesn't look right");
    await db.insert(schema.members).values({ id: newId(), clubId, name: text(p?.name, 80, { required: true }), email, grade, joined: today() });
    return snap(clubId);
  });
}

export async function removeMember(clubId: string, memberId: string): Promise<Result> {
  return run(async () => {
    // Officers can remove anyone; advisors can remove officers and members.
    const { db, me } = await requireMember(clubId, ["admin", "advisor"]);
    const m = await memberIn(db, clubId, memberId);
    if (m.id === me.id) throw new Invalid("You can't remove yourself. Use Hand down instead.");
    if (me.role === "advisor" && m.role === "advisor") throw new NotAllowed("Advisors can't remove another advisor");
    if (!(await keepsALeader(db, clubId, m.id, null))) throw new Invalid("A club needs at least one officer or advisor");
    await db.delete(schema.members).where(eq(schema.members.id, m.id));
    await db.delete(schema.activity).where(and(eq(schema.activity.clubId, clubId), eq(schema.activity.entityId, m.id)));
    return snap(clubId);
  });
}

/* ---------- resources ---------- */

export async function addResource(clubId: string, r: { title: string; url: string; kind: string; category: string }): Promise<Result> {
  return run(async () => {
    const { db, viewer } = await requireMember(clubId, ["admin"]);
    await db.insert(schema.resources).values({
      id: newId(), clubId, title: text(r?.title, 140, { required: true }), url: url(r?.url), kind: oneOf(r?.kind, ["doc", "slides", "link", "sheet"] as const),
      category: text(r?.category, 60) || "Club info", addedBy: viewer.name, date: today(),
    });
    return snap(clubId);
  });
}

export async function removeResource(clubId: string, resourceId: string): Promise<Result> {
  return run(async () => {
    const { db } = await requireMember(clubId, ["admin"]);
    await db.delete(schema.resources).where(and(eq(schema.resources.clubId, clubId), eq(schema.resources.id, id(resourceId))));
    return snap(clubId);
  });
}
