import type { ClubEvent, ClubSettings, WiredStatus, WiredWeek } from "./types";
import { fmt, fromISODate, toISODate } from "./dates";

export const statusMeta: Record<
  WiredStatus,
  { label: string; tone: "neutral" | "accent" | "warn" | "danger" | "muted" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Waiting on advisor", tone: "warn" },
  changes: { label: "Changes requested", tone: "danger" },
  approved: { label: "Approved — ready to send", tone: "accent" },
  sent: { label: "Sent", tone: "muted" },
  skipped: { label: "Skipped", tone: "muted" },
};

const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** "Mon, Nov 16" for one day, "Nov 16 – Nov 20" for a range. */
export const slotRange = (start: string, end?: string | null) =>
  !end || end === start
    ? fromISODate(start).toLocaleDateString("en-US", { weekday: "short", ...o })
    : `${fromISODate(start).toLocaleDateString("en-US", o)} – ${fromISODate(end).toLocaleDateString("en-US", o)}`;

export const weekRange = (w: Pick<WiredWeek, "weekOf" | "endDate">) => slotRange(w.weekOf, w.endDate);

export const todayISO = () => toISODate(new Date());

/** The slot that covers today, or the next upcoming one. */
export const currentSlot = <T extends Pick<WiredWeek, "weekOf" | "endDate">>(slots: T[]) => {
  const today = todayISO();
  const sorted = [...slots].sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  return sorted.find((w) => w.weekOf <= today && (w.endDate ?? w.weekOf) >= today) ?? sorted.find((w) => w.weekOf > today);
};

export const isCurrent = (w: Pick<WiredWeek, "weekOf" | "endDate">) => {
  const today = todayISO();
  return w.weekOf <= today && (w.endDate ?? w.weekOf) >= today;
};

export const eventsInRange = (events: ClubEvent[], start: string, end?: string | null) =>
  events.filter((e) => e.date >= start && e.date <= (end ?? start)).sort((a, b) => a.date.localeCompare(b.date));

/** Builds a draft from the club's template + whatever is on the calendar in that range. */
export const buildDraft = (settings: ClubSettings, events: ClubEvent[], start: string, end?: string | null) => {
  const inRange = eventsInRange(events, start, end);
  const meeting = inRange.find((e) => e.type === "meeting");
  const extras = inRange.filter((e) => e.type !== "meeting");

  const details = [
    meeting?.notes,
    ...extras.map((e) => {
      const day = fmt(e.date, { weekday: "long" });
      if (e.type === "race") return `${e.title} is ${day} at ${e.location}!`;
      if (e.type === "deadline") return `Reminder: ${e.title.toLowerCase()} ${day}.`;
      return `${e.title} on ${day}.`;
    }),
  ]
    .filter(Boolean)
    .map((s) => (s!.endsWith(".") || s!.endsWith("!") ? s : `${s}.`))
    .join(" ");

  const date = meeting ? fmt(meeting.date, { month: "long", day: "numeric" }) : "";

  return settings.wiredTemplate
    .replaceAll("{club}", settings.clubName)
    .replaceAll("{day}", meeting ? fmt(meeting.date, { weekday: "long" }) : settings.meetingDay)
    .replaceAll("{date}", date)
    .replaceAll("{time}", meeting?.time ?? settings.meetingTime)
    .replaceAll("{room}", meeting?.location ?? settings.meetingRoom)
    .replaceAll("{details}", details)
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
};

export const mailtoFor = (settings: ClubSettings, w: Pick<WiredWeek, "weekOf" | "endDate">, message: string) => {
  const subject = `AM Wired — ${settings.clubName} (${weekRange(w)})`;
  return `mailto:${encodeURIComponent(settings.wiredEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
};

/** Capitalizes the first letter (e.g. "your advisor" at the start of a sentence). */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const DAY_OPTIONS = [
  { v: 1, label: "Every school day" },
  { v: 2, label: "Every 2 days" },
  { v: 3, label: "Every 3 days" },
  { v: 5, label: "Every 5 days" },
  { v: 7, label: "Every week" },
  { v: 14, label: "Every 2 weeks" },
];
