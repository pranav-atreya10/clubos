import type { Features } from "./features";

export type Role = "admin" | "advisor" | "member";

/** One line in a version history: who did what, and when. */
export type HistoryEntry = {
  at: string; // ISO timestamp
  by: string;
  action: string;
  /** For rating changes: the rating before this change, so quick edits merge into one entry. */
  kind?: "rating";
  prev?: number | null;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  grade: 9 | 10 | 11 | 12;
  title: string; // "President", "Treasurer", "Member", ...
  /** Permission level in this club. */
  role: Role;
  /** Same as role === "admin". */
  isOfficer: boolean;
  /** Whether this person has signed in and joined (vs. just added by an officer). */
  hasAccount: boolean;
  /** Profile picture URL, or null for initials. */
  avatar: string | null;
  joined: string; // ISO date
  rating: number | null; // leaders-only, out of 10
  ratingNote: string;
  boardCandidate: boolean;
  ratingHistory: HistoryEntry[];
};

export type EventType = "meeting" | "race" | "event" | "deadline";

export type ClubEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // "3:15 PM"
  location: string;
  type: EventType;
  notes: string;
};

export type WiredStatus =
  | "draft"
  | "pending"
  | "changes"
  | "approved"
  | "sent"
  | "skipped";

export type WiredWeek = {
  id: string;
  weekOf: string; // first day this message covers, YYYY-MM-DD
  endDate: string | null; // last day it covers
  status: WiredStatus;
  message: string;
  advisorNote: string;
  updatedAt: string;
  history: { at: string; by: string; action: string }[];
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
  author: string;
  pinned: boolean;
};

export type TaskStatus = "todo" | "doing" | "done";

export type Task = {
  id: string;
  title: string;
  assigneeId: string;
  due: string;
  status: TaskStatus;
  history: HistoryEntry[];
};

export type ResourceKind = "doc" | "slides" | "link" | "sheet";

export type Resource = {
  id: string;
  title: string;
  kind: ResourceKind;
  url: string;
  category: string;
  addedBy: string;
  date: string;
};

export type ClubSettings = {
  clubName: string;
  /** Name(s) of the club's advisor(s), from Members. "your advisor" if there isn't one yet. */
  advisorName: string;
  /** How many days one AM Wired message covers (1 = every school day). */
  wiredDays: number;
  advisorEmail: string;
  wiredEmail: string;
  attendanceUrl: string;
  meetingDay: string;
  meetingTime: string;
  meetingRoom: string;
  wiredTemplate: string;
  features: Features;
};

export type ClubSummary = { id: string; name: string; role: Role };

/** Everything the app needs for one person in one club — already filtered to what they may see. */
export type ClubData = {
  id: string;
  role: Role;
  meId: string;
  /** Only officers get the invite codes. */
  inviteCode: string | null;
  /** Joins as Advisor — for the teacher advisor only. */
  advisorInviteCode: string | null;
  settings: ClubSettings;
  members: Member[];
  events: ClubEvent[];
  wired: WiredWeek[];
  announcements: Announcement[];
  tasks: Task[];
  resources: Resource[];
};

export type Snapshot = {
  viewer: {
    userId: string;
    name: string;
    demo: boolean;
    avatar: string | null;
    /** Officer/advisor somewhere without a passkey or authenticator app yet. */
    needsSecurity: boolean;
  };
  clubs: ClubSummary[];
  club: ClubData | null;
};
