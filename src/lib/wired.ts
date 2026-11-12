import type { ClubEvent, ClubSettings, WiredStatus } from "./types";
import { addDays, fmt, fromISODate, toISODate } from "./dates";

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

export const weekRange = (weekOf: string) => {
  const start = fromISODate(weekOf);
  const end = addDays(start, 4);
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", o)} – ${end.toLocaleDateString("en-US", o)}`;
};

export const eventsInWeek = (events: ClubEvent[], weekOf: string) => {
  const start = weekOf;
  const end = toISODate(addDays(fromISODate(weekOf), 6));
  return events
    .filter((e) => e.date >= start && e.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
};

/** Builds a draft from the club's template + whatever is on the calendar that week. */
export const buildDraft = (
  settings: ClubSettings,
  events: ClubEvent[],
  weekOf: string,
) => {
  const week = eventsInWeek(events, weekOf);
  const meeting = week.find((e) => e.type === "meeting");
  const extras = week.filter((e) => e.type !== "meeting");

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

  const date = meeting
    ? fmt(meeting.date, { month: "long", day: "numeric" })
    : "";

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

export const mailtoFor = (settings: ClubSettings, weekOf: string, message: string) => {
  const subject = `AM Wired — ${settings.clubName} (week of ${weekRange(weekOf)})`;
  return `mailto:${encodeURIComponent(settings.wiredEmail)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(message)}`;
};
