"use client";

import { Flag, Clock, MapPin, Pin } from "lucide-react";
import type { Announcement, ClubEvent, EventType } from "@/lib/types";
import { fmt, fmtShort, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Badge, type Tone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useClub } from "@/lib/store";

export const eventTone: Record<EventType, Tone> = {
  meeting: "neutral",
  race: "accent",
  event: "muted",
  deadline: "warn",
};
export const eventLabel: Record<EventType, string> = {
  meeting: "Meeting",
  race: "Race",
  event: "Event",
  deadline: "Deadline",
};

export function DateBlock({ date, className }: { date: string; className?: string }) {
  return (
    <div className={cn("flex w-12 shrink-0 flex-col items-center rounded-xl border border-line bg-bg py-1.5", className)}>
      <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">{fmt(date, { month: "short" })}</span>
      <span className="text-lg leading-tight font-semibold tabular-nums">{fmt(date, { day: "numeric" })}</span>
    </div>
  );
}

export function EventCard({ e }: { e: ClubEvent }) {
  const race = e.type === "race";
  return (
    <div
      data-reveal
      className={cn(
        "group relative flex w-[260px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto",
        race ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface",
      )}
      style={{ minHeight: 168 }}
    >
      {race && (
        <Flag className="absolute -right-3 -bottom-3 size-28 rotate-[-12deg] opacity-10" strokeWidth={1.2} />
      )}
      <div className="flex items-start justify-between gap-3">
        <span className={cn("text-xs font-medium", race ? "text-accent-fg/75" : "text-muted")}>
          {relativeDay(e.date)} · {fmt(e.date, { weekday: "short" })}
        </span>
        {race ? (
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">Race</span>
        ) : (
          <Badge tone={eventTone[e.type]}>{eventLabel[e.type]}</Badge>
        )}
      </div>
      <div>
        <p className={cn("mb-2 leading-tight", race ? "font-display text-[28px]" : "text-[17px] font-semibold")}>{e.title}</p>
        <div className={cn("space-y-0.5 text-[13px]", race ? "text-accent-fg/80" : "text-muted")}>
          <p className="flex items-center gap-1.5"><Clock className="size-3.5" />{fmtShort(e.date)}, {e.time}</p>
          <p className="flex items-center gap-1.5"><MapPin className="size-3.5" />{e.location}</p>
        </div>
      </div>
    </div>
  );
}

export function AnnouncementItem({ a, actions }: { a: Announcement; actions?: React.ReactNode }) {
  const author = useClub((s) => s.members.find((m) => m.name === a.author));
  const role = author?.role === "advisor" ? "Advisor" : author?.isOfficer ? author.title : null;
  return (
    <article data-reveal className="group py-5 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={a.author} src={author?.avatar} className="size-9" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{a.author}</p>
          <p className="text-xs text-muted">
            {role ? `${role} · ` : ""}
            {relativeDay(a.date)}
          </p>
        </div>
        {actions}
      </div>
      <div className="pl-12">
        <h3 className="mb-1 flex items-center gap-2 font-semibold">
          {a.pinned && <Pin className="size-3.5 shrink-0 fill-current text-accent-text" aria-label="Pinned" />}
          {a.title}
        </h3>
        {a.body && <p className="text-[15px] leading-relaxed whitespace-pre-line text-muted">{a.body}</p>}
      </div>
    </article>
  );
}
