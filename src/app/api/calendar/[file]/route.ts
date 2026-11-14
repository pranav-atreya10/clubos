import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

/** "3:15 PM" → "151500"; anything else (e.g. "Lunch") → null (all-day event). */
function parseTime(t: string) {
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$/);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "p") h += 12;
  return { h, m: Number(m[2] ?? 0) };
}

/**
 * Calendar subscription feed (iCalendar). Anyone with the secret link can read the club's events,
 * which is how Google Calendar, Apple Calendar, and Outlook subscriptions work.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const token = file.replace(/\.ics$/, "");
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const [club] = await db.select().from(schema.clubs).where(eq(schema.clubs.calendarToken, token));
  if (!club || club.features?.calendar === false) return new Response("Not found", { status: 404 });
  const events = await db.select().from(schema.events).where(eq(schema.events.clubId, club.id));

  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClubOS//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(club.name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    const day = e.date.replace(/-/g, "");
    const t = parseTime(e.time);
    lines.push("BEGIN:VEVENT", `UID:${e.id}@clubos`, `DTSTAMP:${now}`);
    if (t) {
      const start = `${day}T${String(t.h).padStart(2, "0")}${String(t.m).padStart(2, "0")}00`;
      const endH = t.h + 1;
      const end = endH < 24 ? `${day}T${String(endH).padStart(2, "0")}${String(t.m).padStart(2, "0")}00` : `${day}T235900`;
      lines.push(`DTSTART:${start}`, `DTEND:${end}`);
    } else {
      const next = new Date(`${e.date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    const desc = [e.time && !t ? e.time : "", e.notes].filter(Boolean).join(" — ");
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${club.name.replace(/[^\w ]/g, "")}.ics"`,
      "Cache-Control": "public, max-age=900",
    },
  });
}
