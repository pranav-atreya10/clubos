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
  title: string; // "President", "Officer", "Member", ...
  isOfficer: boolean;
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
  weekOf: string; // Monday, YYYY-MM-DD
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
  advisorName: string;
  advisorEmail: string;
  wiredEmail: string;
  attendanceUrl: string;
  meetingDay: string;
  meetingTime: string;
  meetingRoom: string;
  wiredTemplate: string;
  features: Features;
};
