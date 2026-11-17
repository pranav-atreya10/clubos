"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Copy, Pause, Play, Plus, SkipForward, Trash2, Wand2 } from "lucide-react";
import { useClub } from "@/lib/store";
import type { AgendaItem } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Page, PageHeader, Card, Empty } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { daysFromToday, fmtLong } from "@/lib/dates";

const uid = () => Math.random().toString(36).slice(2, 10);
const SAMPLE: AgendaItem[] = [
  { id: uid(), text: "Welcome + attendance", minutes: 5, done: false },
  { id: uid(), text: "Updates from officers", minutes: 10, done: false },
  { id: uid(), text: "Main activity", minutes: 25, done: false },
  { id: uid(), text: "Plan next steps + assign tasks", minutes: 10, done: false },
  { id: uid(), text: "Wrap-up + poll for next meeting day", minutes: 5, done: false },
];
/** Kept outside the component so the React compiler doesn't treat it as render-time work. */
const stamp = () => Date.now();
const mmss = (s: number) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

/** Officers + advisor: plan each meeting's agenda, then run it with a timer per item. */
export default function AgendaPage() {
  return (
    <Suspense>
      <Agenda />
    </Suspense>
  );
}

function Agenda() {
  const role = useClub((s) => s.role);
  const events = useClub((s) => s.events);
  const saveAgenda = useClub((s) => s.saveAgenda);
  const today = daysFromToday(0);
  // Upcoming meetings, plus any event that already has an agenda.
  const meetings = events
    .filter((e) => (e.type === "meeting" && e.date >= today) || (e.agenda && e.agenda.length > 0))
    .sort((a, b) => a.date.localeCompare(b.date));
  const fromLink = useSearchParams().get("event");
  const [picked, setPicked] = useState<string | null>(fromLink);
  const [running, setRunning] = useState<{ index: number; startedAt: number; paused: number | null } | null>(null);
  const [now, setNow] = useState(stamp);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(stamp()), 500);
    return () => clearInterval(t);
  }, [running]);

  if (role !== "admin" && role !== "advisor") return <Page><PageHeader title="Officers only" /></Page>;
  const meeting = events.find((e) => e.id === picked) ?? meetings.find((e) => e.date >= today) ?? meetings[meetings.length - 1];
  if (!meeting)
    return (
      <Page className="max-w-3xl">
        <PageHeader title="Agenda" subtitle="Each meeting gets its own agenda. Only officers and the advisor see it." />
        <Empty title="No meetings coming up" body="Add a meeting on the Calendar (type: Meeting), then plan its agenda here." />
      </Page>
    );
  const items = meeting.agenda ?? [];
  const set = (next: AgendaItem[]) => saveAgenda(meeting.id, next);
  const previous = [...events]
    .filter((e) => e.id !== meeting.id && e.agenda && e.agenda.length > 0 && e.date <= meeting.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const total = items.reduce((n, i) => n + i.minutes, 0);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  const current = running ? items[running.index] : null;
  const elapsed = running ? Math.floor(((running.paused ?? now) - running.startedAt) / 1000) : 0;
  const left = current ? current.minutes * 60 - elapsed : 0;
  const next = () => {
    if (!running) return;
    set(items.map((x, i) => (i === running.index ? { ...x, done: true } : x)));
    const after = items.findIndex((x, i) => i > running.index && !x.done);
    setRunning(after >= 0 ? { index: after, startedAt: stamp(), paused: null } : null);
  };

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title="Agenda"
        subtitle={`Only officers and the advisor see this. ${items.length} items · ${total} minutes`}
        actions={
          items.length > 0 &&
          (running ? (
            <Button onClick={() => setRunning(null)}>Stop</Button>
          ) : (
            <Button
              variant="accent"
              onClick={() => {
                const first = items.findIndex((x) => !x.done);
                setRunning({ index: first >= 0 ? first : 0, startedAt: stamp(), paused: null });
              }}
            >
              <Play className="size-4 fill-current" /> Run meeting
            </Button>
          ))
        }
      />

      {running && current && (
        <Card className="mb-6 border-transparent bg-fg p-6 text-bg">
          <p className="text-xs tracking-wide uppercase opacity-60">
            Now · item {running.index + 1} of {items.length}
          </p>
          <p className="mt-1 text-2xl font-semibold">{current.text || "Untitled item"}</p>
          <p className={cn("mt-3 font-display text-7xl tabular-nums", left < 0 && "text-[#f08a80]")}>{mmss(left)}</p>
          <p className="text-sm opacity-60">{left < 0 ? "Over time" : `of ${current.minutes} min`}</p>
          <div className="mt-5 flex gap-2">
            <Button variant="onAccent" onClick={next}>
              <SkipForward className="size-4" /> Next
            </Button>
            <Button
              variant="onAccent"
              onClick={() =>
                setRunning((r) => (r ? (r.paused ? { ...r, startedAt: r.startedAt + (stamp() - r.paused), paused: null } : { ...r, paused: stamp() }) : r))
              }
            >
              {running.paused ? <Play className="size-4" /> : <Pause className="size-4" />} {running.paused ? "Resume" : "Pause"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-6">
        <Select
          aria-label="Meeting"
          value={meeting.id}
          onChange={(e) => {
            setRunning(null);
            setPicked(e.target.value);
          }}
          className="mb-4 h-11 text-base font-semibold"
        >
          {!meetings.some((m) => m.id === meeting.id) && <option value={meeting.id}>{meeting.title} · {fmtLong(meeting.date)}</option>}
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title} · {fmtLong(m.date)}
            </option>
          ))}
        </Select>
        {items.length === 0 ? (
          <Empty
            title="No agenda yet"
            body="Start from a sample and change it, or add your own items."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {previous && (
                  <Button onClick={() => set(previous.agenda!.map((x) => ({ ...x, id: uid(), done: false })))}>
                    <Copy className="size-4" /> Copy from {fmtLong(previous.date)}
                  </Button>
                )}
                <Button onClick={() => set(SAMPLE.map((x) => ({ ...x, id: uid() })))}>
                  <Wand2 className="size-4" /> Use a sample agenda
                </Button>
              </div>
            }
          />
        ) : (
          <ol className="space-y-2">
            {items.map((it, i) => (
              <li key={it.id} className={cn("flex items-center gap-2 rounded-xl border border-line p-2", running?.index === i && "border-accent-text", it.done && "opacity-60")}>
                <button
                  aria-label={it.done ? "Mark not done" : "Mark done"}
                  onClick={() => set(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                  className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full border", it.done ? "border-transparent bg-accent text-accent-fg" : "border-line-strong")}
                >
                  {it.done && <Check className="size-3.5" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                <Input
                  aria-label="Agenda item"
                  value={it.text}
                  onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  placeholder="What happens"
                  className={cn("h-9", it.done && "line-through")}
                />
                </div>
                <div className="w-16 shrink-0">
                <Input
                  aria-label="Minutes"
                  type="number"
                  min={0}
                  max={240}
                  value={it.minutes}
                  onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value) || 0 } : x)))}
                  className="h-9 px-1 text-center tabular-nums"
                />
                </div>
                <span className="text-xs text-faint">min</span>
                <button aria-label="Move up" onClick={() => move(i, -1)} className="rounded p-1 text-faint hover:text-fg"><ArrowUp className="size-4" /></button>
                <button aria-label="Move down" onClick={() => move(i, 1)} className="rounded p-1 text-faint hover:text-fg"><ArrowDown className="size-4" /></button>
                <button aria-label="Remove" onClick={() => set(items.filter((_, j) => j !== i))} className="rounded p-1 text-faint hover:text-danger"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => set([...items, { id: uid(), text: "", minutes: 5, done: false }])} disabled={items.length >= 40}>
            <Plus className="size-4" /> Add item
          </Button>
          {items.some((x) => x.done) && (
            <Button size="sm" variant="ghost" onClick={() => set(items.map((x) => ({ ...x, done: false })))}>
              Uncheck all
            </Button>
          )}
        </div>
      </Card>
    </Page>
  );
}
