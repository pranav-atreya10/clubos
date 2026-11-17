"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Megaphone, Plus } from "lucide-react";
import { useClub } from "@/lib/store";
import type { Announcement, ClubEvent, EventType } from "@/lib/types";
import { daysFromToday } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { eventLabel } from "./bits";
import { ColorPicker } from "@/components/ui/color-picker";

export function AnnouncementDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Announcement }) {
  const add = useClub((s) => s.addAnnouncement);
  const update = useClub((s) => s.updateAnnouncement);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [pinned, setPinned] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit announcement" : "New announcement"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          if (initial) update(initial.id, { title: title.trim(), body: body.trim() });
          else add({ title: title.trim(), body: body.trim(), pinned });
          if (initial) return onClose();
          setTitle("");
          setBody("");
          setPinned(false);
          onClose();
        }}
      >
        <label className="block">
          <Label>Headline</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting moved to Thursday" />
        </label>
        <label className="block">
          <Label>Details</Label>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        {!initial && <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Pin to the top
        </label>}
        <Button type="submit" variant="primary" className="w-full" disabled={!title.trim()}>
          {initial ? "Save changes" : "Post to members"}
        </Button>
      </form>
    </Modal>
  );
}

export function EventDialog({
  open,
  onClose,
  initial,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  /** Editing an existing event. */
  initial?: ClubEvent;
  /** Starting values for a new event (e.g. from a poll). */
  prefill?: Partial<Omit<ClubEvent, "id">>;
}) {
  const addEvent = useClub((s) => s.addEvent);
  const updateEvent = useClub((s) => s.updateEvent);
  const settings = useClub((s) => s.settings);
  const blank = (): Omit<ClubEvent, "id"> => ({
    title: "",
    date: daysFromToday(7),
    time: settings.meetingTime,
    location: settings.meetingRoom,
    type: "meeting",
    notes: "",
    color: null,
  });
  const [f, setF] = useState<Omit<ClubEvent, "id">>(() => (initial ? { ...initial } : { ...blank(), ...prefill }));
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit event" : "New event"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.title.trim()) return;
          if (initial) {
            updateEvent(initial.id, { ...f, title: f.title.trim() });
            return onClose();
          }
          addEvent({ ...f, title: f.title.trim() });
          setF(blank());
          onClose();
        }}
      >
        <label className="block">
          <Label>Title</Label>
          <Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Weekly meeting" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>Type</Label>
            <Select value={f.type} onChange={(e) => set({ type: e.target.value as EventType })}>
              {(Object.keys(eventLabel) as EventType[]).map((t) => (
                <option key={t} value={t}>
                  {eventLabel[t]}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <Label>Date</Label>
            <Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label className="block">
            <Label>Time</Label>
            <Input value={f.time} onChange={(e) => set({ time: e.target.value })} />
          </label>
          <label className="block">
            <Label>Where</Label>
            <Input value={f.location} onChange={(e) => set({ location: e.target.value })} />
          </label>
        </div>
        <div>
          <Label>Color</Label>
          <ColorPicker value={f.color} onChange={(color) => set({ color })} />
        </div>
        <label className="block">
          <Label hint="Used in AM Wired auto-fill">Notes</Label>
          <Textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
        <Button type="submit" variant="primary" className="w-full" disabled={!f.title.trim()}>
          {initial ? "Save changes" : "Add to calendar"}
        </Button>
      </form>
    </Modal>
  );
}

/** The ＋ button in the sidebar: post an announcement or add an event from any page. */
export function QuickAdd() {
  const role = useClub((s) => s.role);
  const features = useClub((s) => s.settings.features);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"announcement" | "event" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const canAnnounce = (role === "admin" || role === "advisor") && features.announcements;
  const canEvent = (role === "admin" || role === "advisor") && features.calendar;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!canAnnounce && !canEvent) return null;

  const pick = (d: "announcement" | "event") => {
    setOpen(false);
    setDialog(d);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-fg text-sm font-medium text-bg transition-opacity hover:opacity-85"
      >
        <Plus className={cn("size-4 transition-transform duration-200", open && "rotate-45")} /> New
      </button>
      {open && (
        <div role="menu" className="absolute inset-x-0 top-full z-40 mt-2 rounded-2xl border border-line bg-surface p-1.5 shadow-card">
          {canAnnounce && (
            <button role="menuitem" onClick={() => pick("announcement")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2">
              <Megaphone className="size-4 text-muted" /> Announcement
            </button>
          )}
          {canEvent && (
            <button role="menuitem" onClick={() => pick("event")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2">
              <CalendarPlus className="size-4 text-muted" /> Calendar event
            </button>
          )}
        </div>
      )}
      <AnnouncementDialog open={dialog === "announcement"} onClose={() => setDialog(null)} />
      <EventDialog open={dialog === "event"} onClose={() => setDialog(null)} />
    </div>
  );
}
