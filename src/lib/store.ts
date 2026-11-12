"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Announcement,
  ClubEvent,
  ClubSettings,
  Member,
  Resource,
  Role,
  Task,
  TaskStatus,
  WiredWeek,
} from "./types";
import {
  seedAnnouncements,
  seedEvents,
  seedMembers,
  seedResources,
  seedSettings,
  seedTasks,
  seedWired,
} from "./seed";
import { buildDraft } from "./wired";
import { addDays, fromISODate, toISODate } from "./dates";
import { ALL_ON, type FeatureKey } from "./features";

const uid = () => Math.random().toString(36).slice(2, 9);
const nowISO = () => new Date().toISOString();

export const DEMO_USERS: Record<Role, { name: string; memberId?: string }> = {
  admin: { name: "Dev Mehta", memberId: "u3" },
  advisor: { name: "Mr. Anderson" },
  member: { name: "Maya Chen", memberId: "u4" },
};

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
  role: Role;
  userName: string;
  setIdentity: (role: Role, name: string) => void;

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
  toggleCandidate: (id: string) => void;
  updateMember: (id: string, p: Partial<Member>) => void;
  addMember: (p: Pick<Member, "name" | "email" | "grade">) => void;
  removeMember: (id: string) => void;

  addResource: (r: Omit<Resource, "id" | "addedBy" | "date">) => void;
  removeResource: (id: string) => void;

  resetDemo: () => void;
};

const seed = (): Data => {
  const settings = seedSettings();
  return {
    settings,
    members: seedMembers(),
    events: seedEvents(),
    wired: seedWired(settings.wiredTemplate),
    announcements: seedAnnouncements(),
    tasks: seedTasks(),
    resources: seedResources(),
  };
};

export const useClub = create<State>()(
  persist(
    (set, get) => {
      const patchWeek = (
        id: string,
        patch: Partial<WiredWeek>,
        action?: string,
      ) =>
        set((s) => ({
          wired: s.wired.map((w) =>
            w.id === id
              ? {
                  ...w,
                  ...patch,
                  updatedAt: nowISO(),
                  history: action
                    ? [...w.history, { at: nowISO(), by: s.userName, action }]
                    : w.history,
                }
              : w,
          ),
        }));

      return {
        ...seed(),
        role: "admin",
        userName: DEMO_USERS.admin.name,
        setIdentity: (role, userName) => set({ role, userName }),

        updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
        setFeature: (key, on) =>
          set((s) => ({ settings: { ...s.settings, features: { ...s.settings.features, [key]: on } } })),

        wiredEdit: (id, message) => {
          const w = get().wired.find((x) => x.id === id);
          // Editing an approved/changes message sends it back to draft.
          const status =
            w && (w.status === "approved" || w.status === "changes") ? "draft" : w?.status;
          patchWeek(id, { message, status });
        },
        wiredGenerate: (id) => {
          const { settings, events, wired } = get();
          const w = wired.find((x) => x.id === id);
          if (!w) return;
          // Without the calendar, drafts use the usual meeting day/time/room from Settings.
          const useCalendar = settings.features.calendar;
          patchWeek(
            id,
            { message: buildDraft(settings, useCalendar ? events : [], w.weekOf), status: "draft" },
            useCalendar ? "Auto-filled draft from calendar" : "Auto-filled draft",
          );
        },
        wiredSubmit: (id) =>
          patchWeek(id, { status: "pending", advisorNote: "" }, `Sent to ${get().settings.advisorName} for approval`),
        wiredApprove: (id, message) =>
          patchWeek(
            id,
            { status: "approved", ...(message !== undefined ? { message } : {}) },
            message !== undefined ? "Edited and approved" : "Approved",
          ),
        wiredRequestChanges: (id, note) =>
          patchWeek(id, { status: "changes", advisorNote: note }, "Requested changes"),
        wiredSkip: (id) => patchWeek(id, { status: "skipped" }, "Skipped this week"),
        wiredUnskip: (id) => patchWeek(id, { status: "draft" }, "Un-skipped"),
        wiredRecall: (id) => patchWeek(id, { status: "draft" }, "Pulled back to edit"),
        wiredMarkSent: (id) => patchWeek(id, { status: "sent" }, "Marked as sent to AM Wired"),
        wiredAddWeek: () =>
          set((s) => {
            const last = [...s.wired].sort((a, b) => a.weekOf.localeCompare(b.weekOf)).at(-1);
            const weekOf = last ? toISODate(addDays(fromISODate(last.weekOf), 7)) : toISODate(new Date());
            return {
              wired: [
                ...s.wired,
                { id: uid(), weekOf, status: "draft", message: "", advisorNote: "", updatedAt: nowISO(), history: [] },
              ],
            };
          }),

        addAnnouncement: (a) =>
          set((s) => ({
            announcements: [
              { ...a, id: uid(), date: toISODate(new Date()), author: s.userName },
              ...s.announcements,
            ],
          })),
        removeAnnouncement: (id) =>
          set((s) => ({ announcements: s.announcements.filter((a) => a.id !== id) })),
        togglePin: (id) =>
          set((s) => ({
            announcements: s.announcements.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)),
          })),

        addTask: (t) => set((s) => ({ tasks: [{ ...t, id: uid(), status: "todo" }, ...s.tasks] })),
        setTaskStatus: (id, status) =>
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
        removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

        addEvent: (e) => set((s) => ({ events: [...s.events, { ...e, id: uid() }] })),
        removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

        setRating: (id, rating) =>
          set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, rating } : m)) })),
        setRatingNote: (id, ratingNote) =>
          set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ratingNote } : m)) })),
        toggleCandidate: (id) =>
          set((s) => ({
            members: s.members.map((m) => (m.id === id ? { ...m, boardCandidate: !m.boardCandidate } : m)),
          })),
        updateMember: (id, p) =>
          set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...p } : m)) })),
        addMember: (p) =>
          set((s) => ({
            members: [
              ...s.members,
              { ...p, id: uid(), title: "Member", isOfficer: false, joined: toISODate(new Date()), rating: null, ratingNote: "", boardCandidate: false },
            ],
          })),
        removeMember: (id) => set((s) => ({ members: s.members.filter((m) => m.id !== id) })),

        addResource: (r) =>
          set((s) => ({
            resources: [{ ...r, id: uid(), addedBy: s.userName, date: toISODate(new Date()) }, ...s.resources],
          })),
        removeResource: (id) => set((s) => ({ resources: s.resources.filter((r) => r.id !== id) })),

        resetDemo: () => set({ ...seed() }),
      };
    },
    {
      name: "clubos-demo-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // Older saved demos don't have feature switches yet — fill in "all on".
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...p.settings,
            features: { ...ALL_ON, ...p.settings?.features },
          },
        };
      },
    },
  ),
);
