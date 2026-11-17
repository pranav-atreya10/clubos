const pad = (n: number) => String(n).padStart(2, "0");

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISODate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export const daysFromToday = (n: number) => toISODate(addDays(new Date(), n));

export const startOfWeek = (d: Date) => {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = c.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  return addDays(c, diff);
};

export const fmt = (s: string, opts: Intl.DateTimeFormatOptions) =>
  fromISODate(s).toLocaleDateString("en-US", opts);

export const fmtShort = (s: string) => fmt(s, { month: "short", day: "numeric" });
export const fmtLong = (s: string) =>
  fmt(s, { weekday: "long", month: "long", day: "numeric" });
export const fmtWeekday = (s: string) => fmt(s, { weekday: "short" });

export const daysUntil = (s: string) => {
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((fromISODate(s).getTime() - t.getTime()) / 86400000);
};

export const relativeDay = (s: string) => {
  const n = daysUntil(s);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 1 && n < 7) return `In ${n} days`;
  if (n < 0) return `${-n} days ago`;
  return fmtShort(s);
};

/**
 * Best guess at a date in text like "Tuesday", "next Thu", "11/18", or "Nov 18".
 * Returns YYYY-MM-DD, or null if there's nothing date-like.
 */
export const guessDate = (text: string): string | null => {
  const s = text.toLowerCase();
  const today = new Date(new Date().toDateString());
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const wd = days.findIndex((d) => new RegExp(`\\b${d}`).test(s));
  if (wd >= 0) {
    let diff = (wd - today.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    return toISODate(addDays(today, diff));
  }
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  let m: number | null = null;
  let d: number | null = null;
  const slash = s.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slash) [m, d] = [Number(slash[1]) - 1, Number(slash[2])];
  const named = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/);
  if (named) [m, d] = [months.indexOf(named[1]), Number(named[2])];
  if (m === null || d === null || m < 0 || m > 11 || d < 1 || d > 31) return null;
  let date = new Date(today.getFullYear(), m, d);
  if (date < today) date = new Date(today.getFullYear() + 1, m, d);
  return toISODate(date);
};
