"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useClub } from "@/lib/store";
import type { ClubEvent, EventType } from "@/lib/types";
import { addDays, daysFromToday, fmt, fmtLong, relativeDay, startOfWeek, toISODate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Page, PageHeader, Card, Chips, SectionTitle } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventDialog } from "@/components/app/quick-add";
import { DateBlock, eventLabel, eventTone } from "@/components/app/bits";

type F = "all" | EventType;

const dotColor: Record<EventType, string> = {
  meeting: "bg-fg",
  race: "bg-accent-text",
  event: "bg-faint",
  deadline: "bg-warn",
};

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
          role === "admin" && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> New event
            </Button>
          )
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
                        <span className={cn("size-1.5 shrink-0 rounded-full", dotColor[e.type])} />
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
              <div data-reveal key={e.id} className="group flex gap-4 rounded-2xl border border-line bg-surface p-4">
                <DateBlock date={e.date} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{e.title}</p>
                    <Badge tone={eventTone[e.type]}>{eventLabel[e.type]}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {relativeDay(e.date)} · {e.time} · {e.location}
                  </p>
                  {e.notes && <p className="mt-1 text-sm text-muted">{e.notes}</p>}
                </div>
                {role === "admin" && (
                  <button
                    aria-label={`Delete ${e.title} on ${fmtLong(e.date)}`}
                    onClick={() => removeEvent(e.id)}
                    className="self-start rounded-full p-1.5 text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-muted">Nothing coming up.</p>}
          </div>
          <p className="mt-4 text-xs text-faint">Showing {upcoming.length} upcoming · {fmt(today, { month: "long", day: "numeric" })} onward</p>
        </section>
      </div>

      <EventDialog open={adding} onClose={() => setAdding(false)} />
    </Page>
  );
}
