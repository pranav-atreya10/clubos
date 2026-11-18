import "server-only";
import { createHash } from "node:crypto";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { schema, type DB } from "@/db";
import { addDays, toISODate } from "@/lib/dates";

/** Calendars ClubOS will read from. A short list keeps the server from being pointed at anything else. */
const ALLOWED_HOSTS = [/(^|\.)schoology\.com$/, /^calendar\.google\.com$/, /^outlook\.(office365|live)\.com$/, /^p\d+-caldav\.icloud\.com$/];
const ZONE = "America/New_York";
const REFRESH_MS = 60 * 60 * 1000;
const MAX_BYTES = 3_000_000;
const MAX_EVENTS = 400;

export class FeedError extends Error {}

/** Accepts webcal:// or https:// links from Schoology, Google, Outlook or iCloud. Returns the https link. */
export function normalizeFeedUrl(input: string): string {
  // Local testing only (never on Vercel): allow one fake calendar server.
  const testOrigin = !process.env.VERCEL ? process.env.CLUBOS_TEST_FEED_ORIGIN : undefined;
  if (testOrigin && input.startsWith(testOrigin + "/")) return input;
  let u: URL;
  try {
    u = new URL(input.trim().replace(/^webcals?:\/\//i, "https://"));
  } catch {
    throw new FeedError("That doesn’t look like a calendar link. It should start with webcal:// or https://");
  }
  if (u.protocol === "http:") u.protocol = "https:";
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) throw new FeedError("Please use a webcal:// or https:// calendar link.");
  if (!ALLOWED_HOSTS.some((r) => r.test(u.hostname.toLowerCase()))) {
    throw new FeedError("ClubOS can import calendars from Schoology, Google Calendar, Outlook or iCloud.");
  }
  return u.toString();
}

export type FeedEvent = { uid: string; title: string; date: string; time: string; location: string; notes: string };

const unescape = (s: string) => s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const wallTime = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;

/** Reads DTSTART in its three shapes: all-day, UTC ("Z"), or local wall-clock time. */
function parseStart(params: string, value: string): { date: string; time: string } | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (h === undefined || /VALUE=DATE(?!-)/i.test(params)) return { date: `${y}-${mo}-${d}`, time: "" };
  if (z) {
    const at = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
    return { date: dateFmt.format(at), time: timeFmt.format(at) };
  }
  return { date: `${y}-${mo}-${d}`, time: wallTime(+h, +mi) };
}

/** A small iCalendar (.ics) reader: just the events, with their name, start, place and notes. */
export function parseIcs(ics: string): FeedEvent[] {
  const lines = ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const out: FeedEvent[] = [];
  let cur: Record<string, { params: string; value: string }> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT" && cur) {
      const start = cur.DTSTART && parseStart(cur.DTSTART.params, cur.DTSTART.value);
      if (start && cur.STATUS?.value !== "CANCELLED") {
        out.push({
          uid: cur.UID?.value || `${start.date}-${cur.SUMMARY?.value ?? ""}`,
          title: unescape(cur.SUMMARY?.value ?? "").slice(0, 140) || "Untitled",
          ...start,
          location: unescape(cur.LOCATION?.value ?? "").slice(0, 140),
          notes: unescape(cur.DESCRIPTION?.value ?? "").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").slice(0, 500),
        });
      }
      cur = null;
    } else if (cur) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const [name, ...params] = line.slice(0, colon).split(";");
      cur[name.toUpperCase()] = { params: params.join(";"), value: line.slice(colon + 1) };
    }
  }
  return out;
}

async function download(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: "text/calendar, */*" }, cache: "no-store" });
  } catch {
    throw new FeedError("Couldn’t reach that calendar. Check the link and try again.");
  }
  const testOrigin = !process.env.VERCEL ? process.env.CLUBOS_TEST_FEED_ORIGIN : undefined;
  const final = new URL(res.url || url);
  if (final.origin !== testOrigin && !ALLOWED_HOSTS.some((r) => r.test(final.hostname))) throw new FeedError("That calendar link redirected somewhere unexpected.");
  if (!res.ok) throw new FeedError(res.status === 404 || res.status === 403 ? "That calendar link doesn’t work anymore. Copy a fresh one from Schoology." : `The calendar site answered with an error (${res.status}).`);
  const body = await res.text();
  if (body.length > MAX_BYTES) throw new FeedError("That calendar is too big to import.");
  if (!body.includes("BEGIN:VCALENDAR")) throw new FeedError("That link isn’t a calendar feed. Look for the iCal link (it starts with webcal://).");
  return body;
}

const looksLikeDeadline = (title: string) => /\b(due|assignment|quiz|test|exam|deadline)\b/i.test(title);

/** Downloads one feed and replaces its events on the club calendar (2 weeks back to 6 months ahead). */
export async function syncFeed(db: DB, feed: typeof schema.calendarFeeds.$inferSelect): Promise<number> {
  try {
    const from = toISODate(addDays(new Date(), -14));
    const to = toISODate(addDays(new Date(), 183));
    const needle = feed.filter.trim().toLowerCase();
    const seen = new Set<string>();
    const events = parseIcs(await download(feed.url))
      .filter((e) => e.date >= from && e.date <= to && (!needle || e.title.toLowerCase().includes(needle)))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, MAX_EVENTS)
      .map((e) => {
        const id = `ext-${createHash("sha1").update(`${feed.id}|${e.uid}|${e.date}`).digest("hex").slice(0, 24)}`;
        return { e, id };
      })
      .filter(({ id }) => !seen.has(id) && Boolean(seen.add(id)));
    await db.transaction(async (tx) => {
      await tx.delete(schema.events).where(eq(schema.events.feedId, feed.id));
      if (events.length)
        await tx.insert(schema.events).values(
          events.map(({ e, id }) => ({
            id,
            clubId: feed.clubId,
            feedId: feed.id,
            title: e.title,
            date: e.date,
            time: e.time,
            location: e.location,
            notes: e.notes,
            type: looksLikeDeadline(e.title) ? ("deadline" as const) : ("event" as const),
          })),
        );
      await tx.update(schema.calendarFeeds).set({ lastSyncedAt: new Date(), lastError: null }).where(eq(schema.calendarFeeds.id, feed.id));
    });
    return events.length;
  } catch (err) {
    const message = err instanceof FeedError ? err.message : "Couldn’t read that calendar.";
    if (!(err instanceof FeedError)) console.error("calendar feed sync failed", err);
    await db.update(schema.calendarFeeds).set({ lastSyncedAt: new Date(), lastError: message }).where(eq(schema.calendarFeeds.id, feed.id));
    throw new FeedError(message);
  }
}

/** Refreshes this club's feeds that are over an hour old. Claims each one first so two visitors don't both fetch it. */
export async function syncStaleFeeds(db: DB, clubId: string): Promise<void> {
  const cutoff = new Date(Date.now() - REFRESH_MS);
  const due = await db
    .update(schema.calendarFeeds)
    .set({ lastSyncedAt: new Date() })
    .where(and(eq(schema.calendarFeeds.clubId, clubId), or(isNull(schema.calendarFeeds.lastSyncedAt), lt(schema.calendarFeeds.lastSyncedAt, cutoff))))
    .returning();
  if (!due.length) return;
  await Promise.race([
    Promise.allSettled(due.map((f) => syncFeed(db, f))),
    new Promise((r) => setTimeout(r, 9000)),
  ]);
}
