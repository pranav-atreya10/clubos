"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Pause, Play, Plus, SkipForward, Trash2, Wand2 } from "lucide-react";
import { useClub } from "@/lib/store";
import type { AgendaItem } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Page, PageHeader, Card, Empty } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const uid = () => Math.random().toString(36).slice(2, 10);
const SAMPLE: AgendaItem[] = [
  { id: uid(), text: "Welcome + attendance", minutes: 5, done: false },
  { id: uid(), text: "Updates from officers", minutes: 10, done: false },
  { id: uid(), text: "Main activity", minutes: 25, done: false },
  { id: uid(), text: "Plan next steps + assign tasks", minutes: 10, done: false },
  { id: uid(), text: "Wrap-up + poll for next meeting day", minutes: 5, done: false },
];
const mmss = (s: number) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

/** Officers only: plan the meeting, then run it with a timer per item. */
export default function AgendaPage() {
  const agenda = useClub((s) => s.agenda);
  const save = useClub((s) => s.saveAgenda);
  const [running, setRunning] = useState<{ index: number; startedAt: number; paused: number | null } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [running]);

  if (!agenda) return <Page><PageHeader title="Officers only" /></Page>;
  const { title, items } = agenda;
  const set = (next: AgendaItem[], t = title) => save(t, next);
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
    setRunning(after >= 0 ? { index: after, startedAt: Date.now(), paused: null } : null);
  };

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title="Agenda"
        subtitle={`Only officers see this. ${items.length} items · ${total} minutes`}
        actions={
          items.length > 0 &&
          (running ? (
            <Button onClick={() => setRunning(null)}>Stop</Button>
          ) : (
            <Button
              variant="accent"
              onClick={() => {
                const first = items.findIndex((x) => !x.done);
                setRunning({ index: first >= 0 ? first : 0, startedAt: Date.now(), paused: null });
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
                setRunning((r) => (r ? (r.paused ? { ...r, startedAt: r.startedAt + (Date.now() - r.paused), paused: null } : { ...r, paused: Date.now() }) : r))
              }
            >
              {running.paused ? <Play className="size-4" /> : <Pause className="size-4" />} {running.paused ? "Resume" : "Pause"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-6">
        <Input aria-label="Meeting name" value={title} onChange={(e) => set(items, e.target.value)} className="mb-4 h-11 text-lg font-semibold" />
        {items.length === 0 ? (
          <Empty
            title="No agenda yet"
            body="Start from a sample and change it, or add your own items."
            action={
              <Button onClick={() => set(SAMPLE.map((x) => ({ ...x, id: uid() })))}>
                <Wand2 className="size-4" /> Use a sample agenda
              </Button>
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
                <Input
                  aria-label="Agenda item"
                  value={it.text}
                  onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  placeholder="What happens"
                  className={cn("h-9 flex-1", it.done && "line-through")}
                />
                <Input
                  aria-label="Minutes"
                  type="number"
                  min={0}
                  max={240}
                  value={it.minutes}
                  onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value) || 0 } : x)))}
                  className="h-9 w-16 text-center tabular-nums"
                />
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
              Uncheck all for next meeting
            </Button>
          )}
        </div>
      </Card>
    </Page>
  );
}
