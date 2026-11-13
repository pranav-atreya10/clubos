import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { Features } from "@/lib/features";

const now = () => timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

/** People who can sign in. Demo people have ids like "demo-officer" and no password. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  /** Lowercased email used to sign in. Null for demo people (they can't sign in with a password). */
  loginEmail: text("login_email"),
  /** scrypt hash — never the password itself. */
  passwordHash: text("password_hash"),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
  createdAt: now(),
}, (t) => [uniqueIndex("users_login_email").on(t.loginEmail)]);

/** Signed-in browsers. We store a hash of the session token, so a database leak can't be used to log in. */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: now(),
}, (t) => [index("sessions_user").on(t.userId)]);

export const clubs = pgTable("clubs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull(),
  /** Separate code that joins as Advisor (give it only to the teacher advisor). */
  advisorInviteCode: text("advisor_invite_code"),
  advisorName: text("advisor_name").notNull().default("Your advisor"),
  wiredEmail: text("wired_email").notNull().default("amwired@livingston.org"),
  // NOTE: placeholder — this is NOT the real attendance site yet. Change it (in Settings) once we have the right link.
  attendanceUrl: text("attendance_url").notNull().default("https://livingston.schoology.com"),
  meetingDay: text("meeting_day").notNull().default("Wednesday"),
  meetingTime: text("meeting_time").notNull().default("3:15 PM"),
  meetingRoom: text("meeting_room").notNull().default(""),
  wiredTemplate: text("wired_template").notNull(),
  features: jsonb("features").$type<Features>().notNull(),
  createdAt: now(),
}, (t) => [uniqueIndex("clubs_invite_code").on(t.inviteCode), uniqueIndex("clubs_advisor_invite_code").on(t.advisorInviteCode)]);

/**
 * Everyone in a club — with or without an account. Officers can add people by name/email;
 * `userId` gets linked when that person signs in and joins with the invite code.
 */
export const members = pgTable("members", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  grade: integer("grade").notNull().default(9),
  /** Permission level in this club. */
  role: text("role", { enum: ["admin", "advisor", "member"] }).notNull().default("member"),
  /** Free-text label like "President" or "Treasurer". */
  title: text("title").notNull().default("Member"),
  joined: date("joined", { mode: "string" }).notNull(),
  rating: integer("rating"),
  ratingNote: text("rating_note").notNull().default(""),
  boardCandidate: boolean("board_candidate").notNull().default(false),
  createdAt: now(),
}, (t) => [
  index("members_club").on(t.clubId),
  uniqueIndex("members_club_user").on(t.clubId, t.userId),
]);

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  time: text("time").notNull().default(""),
  location: text("location").notNull().default(""),
  type: text("type", { enum: ["meeting", "race", "event", "deadline"] }).notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: now(),
}, (t) => [index("events_club").on(t.clubId)]);

export const wiredWeeks = pgTable("wired_weeks", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  weekOf: date("week_of", { mode: "string" }).notNull(),
  status: text("status", { enum: ["draft", "pending", "changes", "approved", "sent", "skipped"] }).notNull().default("draft"),
  message: text("message").notNull().default(""),
  advisorNote: text("advisor_note").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (t) => [uniqueIndex("wired_club_week").on(t.clubId, t.weekOf)]);

export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  date: date("date", { mode: "string" }).notNull(),
  author: text("author").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: now(),
}, (t) => [index("announcements_club").on(t.clubId)]);

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  assigneeId: text("assignee_id").references(() => members.id, { onDelete: "set null" }),
  due: date("due", { mode: "string" }).notNull(),
  status: text("status", { enum: ["todo", "doing", "done"] }).notNull().default("todo"),
  createdAt: now(),
}, (t) => [index("tasks_club").on(t.clubId)]);

export const resources = pgTable("resources", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  kind: text("kind", { enum: ["doc", "slides", "link", "sheet"] }).notNull(),
  url: text("url").notNull(),
  category: text("category").notNull().default("Club info"),
  addedBy: text("added_by").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  createdAt: now(),
}, (t) => [index("resources_club").on(t.clubId)]);

/** Version history for AM Wired weeks, tasks, and member ratings. */
export const activity = pgTable("activity", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  entityType: text("entity_type", { enum: ["wired", "task", "rating"] }).notNull(),
  entityId: text("entity_id").notNull(),
  at: timestamp("at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  by: text("by").notNull(),
  action: text("action").notNull(),
  kind: text("kind"),
  prev: integer("prev"),
}, (t) => [index("activity_entity").on(t.clubId, t.entityType, t.entityId)]);
