"use client";

import { create } from "zustand";
import type {
  Announcement,
  ClubEvent,
  ClubSettings,
  ClubSummary,
  Member,
  Resource,
  Role,
  Snapshot,
  Task,
  TaskStatus,
  WiredWeek,
} from "./types";
import type { FeatureKey } from "./features";
import { ALL_ON } from "./features";
import { DEFAULT_TEMPLATE } from "./seed";
import * as api from "@/server/actions";
import type { Result } from "@/server/actions";

/** Demo logins (only used when Clerk isn't set up). */
export const DEMO_USERS: Record<Role, { id: string; name: string }> = {
  admin: { id: "demo-officer", name: "Dev Mehta" },
  advisor: { id: "demo-advisor", name: "Mr. Anderson" },
  member: { id: "demo-member", name: "Maya Chen" },
};

type Status = "loading" | "ready" | "no-club" | "signed-out" | "error";

type Data = {
  settings: ClubSettings;
  members: Member[];
  events: ClubEvent[];
  wired: WiredWeek[];
  announcements: Announcement[];
  tasks: Task[];
  resources: Resource[];
};

type State = Data & {
  status: Status;
  /** Last save problem, shown as a small banner. */
  error: string | null;
  demo: boolean;
  clubs: ClubSummary[];
  clubId: string | null;
  role: Role;
  userName: string;
  meId: string | null;
  inviteCode: string | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  dismissError: () => void;
  setDemoRole: (role: Role) => void;
  switchClub: (clubId: string) => Promise<void>;
  createClub: (name: string) => Promise<string | null>;
  joinClub: (code: string) => Promise<string | null>;
  newInvite: () => void;

  updateSettings: (p: Partial<ClubSettings>) => void;
  setFeature: (key: FeatureKey, on: boolean) => void;

  wiredEdit: (id: string, message: string) => void;
  wiredGenerate: (id: string) => void;
  wiredSubmit: (id: string) => void;
  wiredApprove: (id: string, message?: string) => void;
  wiredRequestChanges: (id: string, note: string) => void;
  wiredSkip: (id: string) => void;
  wiredUnskip: (id: string) => void;
  wiredRecall: (id: string) => void;
  wiredMarkSent: (id: string) => void;
  wiredAddWeek: () => void;

  addAnnouncement: (a: Pick<Announcement, "title" | "body" | "pinned">) => void;
  removeAnnouncement: (id: string) => void;
  togglePin: (id: string) => void;

  addTask: (t: Pick<Task, "title" | "assigneeId" | "due">) => void;
  setTaskStatus: (id: string, s: TaskStatus) => void;
  removeTask: (id: string) => void;

  addEvent: (e: Omit<ClubEvent, "id">) => void;
  removeEvent: (id: string) => void;

  setRating: (id: string, rating: number | null) => void;
  setRatingNote: (id: string, note: string) => void;
  logRatingNote: (id: string, before: string) => void;
  toggleCandidate: (id: string) => void;
  updateMember: (id: string, p: Partial<Member>) => void;
  setMemberRole: (id: string, role: Role) => void;
  addMember: (p: Pick<Member, "name" | "email" | "grade">) => void;
  removeMember: (id: string) => void;

  addResource: (r: Omit<Resource, "id" | "addedBy" | "date">) => void;
  removeResource: (id: string) => void;

  resetDemo: () => void;
};

const EMPTY: Data = {
  settings: {
    clubName: "",
    advisorName: "",
    advisorEmail: "",
    wiredEmail: "",
    attendanceUrl: "",
    meetingDay: "",
    meetingTime: "",
    meetingRoom: "",
    wiredTemplate: DEFAULT_TEMPLATE,
    features: { ...ALL_ON },
  },
  members: [],
  events: [],
  wired: [],
  announcements: [],
  tasks: [],
  resources: [],
};

const fromSnapshot = (s: Snapshot): Partial<State> => {
  const base = { demo: s.viewer.demo, userName: s.viewer.name, clubs: s.clubs };
  if (!s.club) return { ...base, ...EMPTY, status: "no-club", clubId: null, meId: null, inviteCode: null, role: "member" };
  const c = s.club;
  return {
    ...base,
    status: "ready",
    clubId: c.id,
    role: c.role,
    meId: c.meId,
    inviteCode: c.inviteCode,
    settings: c.settings,
    members: c.members,
    events: c.events,
    wired: c.wired,
    announcements: c.announcements,
    tasks: c.tasks,
    resources: c.resources,
  };
};

/* ---- background saving ---- */

let inFlight = 0;
/** Typing is saved after a short pause, one timer per field. */
const timers = new Map<string, { t: ReturnType<typeof setTimeout>; run: () => Promise<void> }>();
export const hasPendingSaves = () => inFlight > 0 || timers.size > 0;

async function flushTyping() {
  const jobs = [...timers.values()];
  timers.forEach((j) => clearTimeout(j.t));
  timers.clear();
  await Promise.all(jobs.map((j) => j.run()));
}

export const useClub = create<State>()((set, get) => {
  /** Apply a change on screen right away, save it, then show the saved version from the database. */
  const save = async (optimistic: ((s: State) => Partial<State>) | null, server: (clubId: string) => Promise<Result>) => {
    const clubId = get().clubId;
    if (!clubId) return;
    await flushTyping();
    if (optimistic) set(optimistic(get()));
    inFlight++;
    let failed = false;
    try {
      const r = await server(clubId);
      if (r.ok) set(fromSnapshot(r.snapshot));
      else {
        failed = true;
        set({ error: r.error });
      }
    } catch {
      failed = true;
      set({ error: "Couldn't reach the server. Check your connection." });
    } finally {
      inFlight--;
    }
    // Undo what we showed early by reloading what's really saved.
    if (failed) await get().refresh();
  };

  /** For text boxes: update the screen now, save after the person pauses typing. */
  const saveTyping = (key: string, optimistic: (s: State) => Partial<State>, server: (clubId: string) => Promise<Result>) => {
    const clubId = get().clubId;
    if (!clubId) return;
    set(optimistic(get()));
    const prev = timers.get(key);
    if (prev) clearTimeout(prev.t);
    const run = async () => {
      timers.delete(key);
      inFlight++;
      let failed = false;
      try {
        const r = await server(clubId);
        // Don't replace what's on screen (they may still be typing) unless something went wrong.
        if (!r.ok) {
          failed = true;
          set({ error: r.error });
        }
      } catch {
        failed = true;
        set({ error: "Couldn't reach the server. Check your connection." });
      } finally {
        inFlight--;
      }
      if (failed) await get().refresh();
    };
    timers.set(key, { t: setTimeout(run, 600), run });
  };

  const mapList = <K extends "wired" | "tasks" | "members" | "announcements">(k: K, id: string, patch: Partial<State[K][number]>) =>
    (s: State) => ({ [k]: (s[k] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }) as Partial<State>;

  const handle = async (p: Promise<Result>): Promise<string | null> => {
    try {
      const r = await p;
      if (r.ok) {
        set(fromSnapshot(r.snapshot));
        return null;
      }
      return r.error;
    } catch {
      return "Couldn't reach the server. Check your connection.";
    }
  };

  return {
    ...EMPTY,
    status: "loading",
    error: null,
    demo: false,
    clubs: [],
    clubId: null,
    role: "member",
    userName: "",
    meId: null,
    inviteCode: null,

    load: async () => {
      const r = await api.getSnapshot().catch(() => null);
      if (!r) return set({ status: "error", error: "Couldn't reach the server." });
      if (r.ok) set(fromSnapshot(r.snapshot));
      else set({ status: r.error === "Please sign in" ? "signed-out" : "error", error: r.error });
    },
    refresh: async () => {
      if (hasPendingSaves()) return;
      const r = await api.getSnapshot().catch(() => null);
      if (r?.ok && !hasPendingSaves()) set(fromSnapshot(r.snapshot));
    },
    dismissError: () => set({ error: null }),

    setDemoRole: (role) => {
      set({ role, userName: DEMO_USERS[role].name });
      void handle(api.setDemoUser(DEMO_USERS[role].id));
    },
    switchClub: async (clubId) => {
      await flushTyping();
      const err = await handle(api.switchClub(clubId));
      if (err) set({ error: err });
    },
    createClub: (name) => handle(api.createClub(name)),
    joinClub: (code) => handle(api.joinClub(code)),
    newInvite: () => void save(null, (c) => api.newInvite(c)),

    updateSettings: (p) =>
      saveTyping(`settings:${Object.keys(p).join(",")}`, (s) => ({ settings: { ...s.settings, ...p } }), (c) => api.updateSettings(c, p)),
    setFeature: (key, on) =>
      void save((s) => ({ settings: { ...s.settings, features: { ...s.settings.features, [key]: on } } }), (c) => api.setFeature(c, key, on)),

    wiredEdit: (id, message) =>
      saveTyping(`wired:${id}`, (s) => {
        const w = s.wired.find((x) => x.id === id);
        const status = w && (w.status === "approved" || w.status === "changes") ? "draft" : w?.status;
        return mapList("wired", id, { message, status })(s);
      }, (c) => api.wiredEdit(c, id, message)),
    wiredGenerate: (id) => void save(null, (c) => api.wiredGenerate(c, id)),
    wiredSubmit: (id) => void save(mapList("wired", id, { status: "pending" }), (c) => api.wiredSubmit(c, id)),
    wiredApprove: (id, message) =>
      void save(mapList("wired", id, { status: "approved", ...(message !== undefined ? { message } : {}) }), (c) => api.wiredApprove(c, id, message)),
    wiredRequestChanges: (id, note) => void save(mapList("wired", id, { status: "changes", advisorNote: note }), (c) => api.wiredRequestChanges(c, id, note)),
    wiredSkip: (id) => void save(mapList("wired", id, { status: "skipped" }), (c) => api.wiredSkip(c, id)),
    wiredUnskip: (id) => void save(mapList("wired", id, { status: "draft" }), (c) => api.wiredUnskip(c, id)),
    wiredRecall: (id) => void save(mapList("wired", id, { status: "draft" }), (c) => api.wiredRecall(c, id)),
    wiredMarkSent: (id) => void save(mapList("wired", id, { status: "sent" }), (c) => api.wiredMarkSent(c, id)),
    wiredAddWeek: () => void save(null, (c) => api.wiredAddWeek(c)),

    addAnnouncement: (a) => void save(null, (c) => api.addAnnouncement(c, a)),
    removeAnnouncement: (id) => void save((s) => ({ announcements: s.announcements.filter((a) => a.id !== id) }), (c) => api.removeAnnouncement(c, id)),
    togglePin: (id) =>
      void save((s) => ({ announcements: s.announcements.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)) }), (c) => api.togglePin(c, id)),

    addTask: (t) => void save(null, (c) => api.addTask(c, t)),
    setTaskStatus: (id, status) => void save(mapList("tasks", id, { status }), (c) => api.setTaskStatus(c, id, status)),
    removeTask: (id) => void save((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }), (c) => api.removeTask(c, id)),

    addEvent: (e) => void save(null, (c) => api.addEvent(c, e)),
    removeEvent: (id) => void save((s) => ({ events: s.events.filter((e) => e.id !== id) }), (c) => api.removeEvent(c, id)),

    setRating: (id, rating) => void save(mapList("members", id, { rating }), (c) => api.setRating(c, id, rating)),
    setRatingNote: (id, ratingNote) => saveTyping(`note:${id}`, mapList("members", id, { ratingNote }), (c) => api.setRatingNote(c, id, ratingNote)),
    logRatingNote: (id, before) => void save(null, (c) => api.logRatingNote(c, id, before)),
    toggleCandidate: (id) => {
      const m = get().members.find((x) => x.id === id);
      void save(mapList("members", id, { boardCandidate: !m?.boardCandidate }), (c) => api.toggleCandidate(c, id));
    },
    updateMember: (id, p) => {
      if (p.title === undefined) return;
      const title = p.title;
      saveTyping(`title:${id}`, mapList("members", id, { title }), (c) => api.updateMemberTitle(c, id, title));
    },
    setMemberRole: (id, role) => void save(mapList("members", id, { role, isOfficer: role === "admin" }), (c) => api.setMemberRole(c, id, role)),
    addMember: (p) => void save(null, (c) => api.addMember(c, p)),
    removeMember: (id) => void save((s) => ({ members: s.members.filter((m) => m.id !== id) }), (c) => api.removeMember(c, id)),

    addResource: (r) => void save(null, (c) => api.addResource(c, r)),
    removeResource: (id) => void save((s) => ({ resources: s.resources.filter((r) => r.id !== id) }), (c) => api.removeResource(c, id)),

    resetDemo: () => void handle(api.resetDemo()),
  };
});
