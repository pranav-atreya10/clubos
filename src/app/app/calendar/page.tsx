"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, CalendarSync, Check, ChevronLeft, ChevronRight, Copy, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useClub } from "@/lib/store";
import type { ClubEvent, EventType } from "@/lib/types";
import { addDays, daysFromToday, fmt, fmtLong, relativeDay, startOfWeek, toISODate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Page, PageHeader, Card, Chips, SectionTitle } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventDialog } from "@/components/app/quick-add";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/field";
import { colorHex } from "@/lib/colors";
import { DateBlock, eventLabel, eventTone } from "@/components/app/bits";

type F = "all" | EventType;

const dotColor: Record<EventType, string> = {
  meeting: "bg-fg",
  race: "bg-accent-text",
  event: "bg-faint",
  deadline: "bg-warn",
};

/** Calendar subscription link for Google / Apple / Outlook. */
function SubscribeDialog({ open, onClose, path }: { open: boolean; onClose: () => void; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  const webcal = url.replace(/^https?:/, "webcal:");
  return (
    <Modal open={open} onClose={onClose} title="Add to your calendar">
      <p className="mb-4 text-sm text-muted">Club events show up in your own calendar app and update by themselves (usually within a few hours).</p>
      <div className="mb-4 flex gap-2">
        <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <ul className="space-y-2 text-sm">
        <li>
          <span className="font-medium">Google Calendar:</span>{" "}
          <a className="text-accent-text underline-offset-4 hover:underline" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">
            open
          </a>{" "}
          (or Other calendars → ＋ → From URL, paste the link)
        </li>
        <li>
          <span className="font-medium">Apple Calendar / iPhone:</span>{" "}
          <a className="text-accent-text underline-offset-4 hover:underline" href={webcal}>
            subscribe
          </a>
        </li>
        <li>
          <span className="font-medium">Outlook:</span> Add calendar → Subscribe from web → paste the link
        </li>
      </ul>
      <p className="mt-4 rounded-xl bg-bg-subtle px-3 py-2 text-xs text-muted">
        Schoology can’t subscribe to outside calendars, so this works with the calendar apps people already check. Keep the link
        within the club — anyone with it can see event names and times.
      </p>
    </Modal>
  );
}

export default function CalendarPage() {
  const events = useClub((s) => s.events);
  const role = useClub((s) => s.role);
  const removeEvent = useClub((s) => s.removeEvent);
  const [filter, setFilter] = useState<F>("all");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [adding, setAdding] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const calendarUrl = useClub((s) => s.calendarUrl);
  const feedCount = useClub((s) => s.feeds?.length ?? 0);
  const today = daysFromToday(0);

  const filtered = useMemo(
    () => events.filter((e) => filter === "all" || e.type === filter).sort((a, b) => a.date.localeCompare(b.date)),
    [events, filter],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, ClubEvent[]>();
    filtered.forEach((e) => m.set(e.date, [...(m.get(e.date) ?? []), e]));
    return m;
  }, [filtered]);

  const gridStart = startOfWeek(cursor);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const upcoming = filtered.filter((e) => e.date >= today);

  return (
    <Page>
      <PageHeader
        title="Calendar"
        subtitle="Meetings, races, and deadlines in one place."
        actions={
          <>
            <Button onClick={() => setSubscribing(true)}>
              <CalendarPlus className="size-4" /> Add to my calendar
            </Button>
            {role === "admin" && (
              <Link href="/app/settings#school-calendar" className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm text-muted hover:text-fg">
                <CalendarSync className="size-4" /> {feedCount ? "School calendar" : "Add school calendar"}
              </Link>
            )}
            {(role === "admin" || role === "advisor") && (
              <Button variant="primary" onClick={() => setAdding(true)}>
                <Plus className="size-4" /> New event
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6">
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "meeting", label: "Meetings" },
            { value: "race", label: "Races" },
            { value: "deadline", label: "Deadlines" },
            { value: "event", label: "Events" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-3xl">
              {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium tracking-wide text-faint uppercase">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="pb-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {days.map((d) => {
              const iso = toISODate(d);
              const evs = byDate.get(iso) ?? [];
              const inMonth = d.getMonth() === cursor.getMonth();
              return (
                <div key={iso} className={cn("min-h-[64px] bg-surface p-1.5 sm:min-h-[92px] sm:p-2", !inMonth && "bg-bg-subtle")}>
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                      iso === today ? "bg-fg font-semibold text-bg" : inMonth ? "text-fg" : "text-faint",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {evs.slice(0, 2).map((e) => (
                      <div key={e.id} title={e.title} className="flex items-center gap-1">
                        <span className={cn("size-1.5 shrink-0 rounded-full", !e.color && dotColor[e.type])} style={e.color ? { background: colorHex(e.color)! } : undefined} />
                        <span className="hidden truncate text-[11px] sm:inline">{e.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <section>
          <SectionTitle>Up next</SectionTitle>
          <div className="space-y-2">
            {upcoming.map((e) => (
              <div
                data-reveal
                key={e.id}
                className="group flex gap-4 rounded-2xl border border-line bg-surface p-4"
                style={e.color ? { borderLeft: `4px solid ${colorHex(e.color)}` } : undefined}
              >
                <DateBlock date={e.date} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{e.title}</p>
                    <Badge tone={eventTone[e.type]}>{eventLabel[e.type]}</Badge>
                    {e.source && <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{e.source}</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {[relativeDay(e.date), e.time, e.location].filter(Boolean).join(" · ")}
                  </p>
                  {e.notes && <p className="mt-1 text-sm text-muted">{e.notes}</p>}
                  {(role === "admin" || role === "advisor") && !e.source && (e.type === "meeting" || (e.agenda?.length ?? 0) > 0) && (
                    <Link href={`/app/agenda?event=${e.id}`} className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent-text underline-offset-4 hover:underline">
                      <ListChecks className="size-4" />
                      {e.agenda?.length ? `Agenda · ${e.agenda.length} items` : "Plan agenda"}
                    </Link>
                  )}
                </div>
                {(role === "admin" || role === "advisor") && !e.source && (
                  <div className="flex self-start">
                  <button
                    aria-label={`Edit ${e.title}`}
                    onClick={() => setEditing(e)}
                    className="rounded-full p-1.5 text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-fg focus:opacity-100"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    aria-label={`Delete ${e.title} on ${fmtLong(e.date)}`}
                    onClick={() => removeEvent(e.id)}
                    className="rounded-full p-1.5 text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  </div>
                )}
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-muted">Nothing coming up.</p>}
          </div>
          <p className="mt-4 text-xs text-faint">Showing {upcoming.length} upcoming · {fmt(today, { month: "long", day: "numeric" })} onward</p>
        </section>
      </div>

      <EventDialog open={adding} onClose={() => setAdding(false)} />
      {editing && <EventDialog key={editing.id} open initial={editing} onClose={() => setEditing(null)} />}
      <SubscribeDialog open={subscribing} onClose={() => setSubscribing(false)} path={calendarUrl} />
    </Page>
  );
}
