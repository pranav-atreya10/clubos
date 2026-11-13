import type {
  Announcement,
  ClubEvent,
  ClubSettings,
  HistoryEntry,
  Member,
  Resource,
  Task,
  WiredWeek,
} from "./types";
import { ALL_ON } from "./features";
import { addDays, daysFromToday, startOfWeek, toISODate } from "./dates";

export const DEFAULT_TEMPLATE =
  "Attention members! {club} meets this {day}, {date}, at {time} in {room}. {details} Everyone is welcome — see you there!";

export const seedSettings = (): ClubSettings => ({
  clubName: "Velocity Racing Club",
  advisorName: "Mr. Anderson",
  advisorEmail: "anderson@school.edu",
  wiredEmail: "amwired@livingston.org",
  // NOTE: placeholder — not the real attendance site yet.
  attendanceUrl: "https://livingston.schoology.com",
  meetingDay: "Wednesday",
  meetingTime: "3:15 PM",
  meetingRoom: "Room 214",
  wiredTemplate: DEFAULT_TEMPLATE,
  wiredDays: 7,
  features: { ...ALL_ON },
});

const ago = (days: number, hour = 16) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

/** A believable rating history: first rated a month ago, sometimes changed since. */
const ratingHistory = (rating: number | null, earlier?: { rating: number; by: string; days: number; note?: string }): HistoryEntry[] => {
  if (rating === null) return [];
  if (!earlier) return [{ at: ago(30), by: "Pranav Atreya", action: `Rated ${rating}/10`, kind: "rating", prev: null }];
  return [
    { at: ago(30), by: "Pranav Atreya", action: `Rated ${earlier.rating}/10`, kind: "rating", prev: null },
    { at: ago(earlier.days), by: earlier.by, action: `Changed rating from ${earlier.rating}/10 to ${rating}/10`, kind: "rating", prev: earlier.rating },
    ...(earlier.note ? [{ at: ago(earlier.days, 17), by: earlier.by, action: `Updated note: “${earlier.note}”` }] : []),
  ];
};

const CHANGES: Record<string, { rating: number; by: string; days: number; note?: string }> = {
  u4: { rating: 7, by: "Sam Rivera", days: 6, note: "Never misses. Led the pit-stop drill unprompted." },
  u9: { rating: 6, by: "Dev Mehta", days: 4, note: "Missed the last 3 meetings." },
  u10: { rating: 6, by: "Mr. Anderson", days: 9 },
};

const m = (
  id: string,
  name: string,
  grade: Member["grade"],
  title: string,
  rating: number | null,
  note = "",
  boardCandidate = false,
): Member => ({
  id,
  name,
  email: `${name.split(" ")[0].toLowerCase()}@school.edu`,
  grade,
  title,
  role: title !== "Member" ? "admin" : "member",
  isOfficer: title !== "Member",
  hasAccount: false,
  avatar: null,
  joined: daysFromToday(-Math.floor(Math.random() * 400 + 20)),
  rating,
  ratingNote: note,
  boardCandidate,
  ratingHistory: ratingHistory(rating, CHANGES[id]),
});

export const seedMembers = (): Member[] => [
  m("u1", "Pranav Atreya", 11, "President", 10, "Founder."),
  m("u2", "Sam Rivera", 11, "Vice President", 9, "Runs race logistics."),
  m("u3", "Dev Mehta", 11, "Communications", 9, "Owns AM Wired + Schoology."),
  m("u4", "Maya Chen", 10, "Member", 9, "Never misses. Led the pit-stop drill unprompted.", true),
  m("u5", "Jordan Reyes", 10, "Member", 8, "Great with new members.", true),
  m("u6", "Aisha Khan", 9, "Member", 7, "Quiet but always prepared."),
  m("u7", "Leo Park", 12, "Treasurer", 8, ""),
  m("u8", "Sofia Martins", 9, "Member", 6, "Shows up, needs a nudge to step up."),
  m("u9", "Ethan Brooks", 10, "Member", 4, "Missed the last 3 meetings."),
  m("u10", "Nina Okafor", 9, "Member", 8, "Volunteered to design the team shirt.", true),
  m("u11", "Kai Thompson", 11, "Member", 5, ""),
  m("u12", "Ava Lindqvist", 10, "Member", null, ""),
];

export const seedEvents = (): ClubEvent[] => {
  const mon = startOfWeek(new Date());
  const wed = (w: number) => toISODate(addDays(mon, 2 + w * 7));
  const sat = (w: number) => toISODate(addDays(mon, 5 + w * 7));
  return [
    { id: "e1", title: "Weekly meeting", date: wed(0), time: "3:15 PM", location: "Room 214", type: "meeting", notes: "Track walk-through for regionals." },
    { id: "e2", title: "Regional Qualifier", date: sat(0), time: "8:00 AM", location: "Riverside Speedway", type: "race", notes: "Bus leaves 7:00 AM from the front lot." },
    { id: "e3", title: "Weekly meeting", date: wed(1), time: "3:15 PM", location: "Room 214", type: "meeting", notes: "Race debrief + car tune-ups." },
    { id: "e4", title: "Permission slips due", date: toISODate(addDays(mon, 8)), time: "End of day", location: "Front office", type: "deadline", notes: "For the State Invitational." },
    { id: "e5", title: "Weekly meeting", date: wed(2), time: "3:15 PM", location: "Room 214", type: "meeting", notes: "Strategy session." },
    { id: "e6", title: "State Invitational", date: sat(2), time: "9:00 AM", location: "Capitol Circuit", type: "race", notes: "Top 8 drivers compete." },
    { id: "e7", title: "Weekly meeting", date: wed(3), time: "3:15 PM", location: "Room 214", type: "meeting", notes: "" },
    { id: "e8", title: "Club fair booth", date: toISODate(addDays(mon, 25)), time: "Lunch", location: "Cafeteria", type: "event", notes: "Bring the demo car." },
    { id: "e9", title: "Weekly meeting", date: wed(4), time: "3:15 PM", location: "Room 214", type: "meeting", notes: "" },
  ];
};

export const seedWired = (template: string): WiredWeek[] => {
  const mon = startOfWeek(new Date());
  const now = new Date().toISOString();
  const wk = (n: number) => toISODate(addDays(mon, n * 7));
  const wkEnd = (n: number) => toISODate(addDays(mon, n * 7 + 4));
  void template;
  return [
    {
      id: "w-1", weekOf: wk(-1), endDate: wkEnd(-1), status: "sent",
      message: "Attention members! Velocity Racing Club meets this Wednesday at 3:15 PM in Room 214. We're prepping for the Regional Qualifier — new members welcome!",
      advisorNote: "", updatedAt: now,
      history: [{ at: now, by: "Mr. Anderson", action: "Approved" }, { at: now, by: "Dev Mehta", action: "Marked as sent" }],
    },
    {
      id: "w0", weekOf: wk(0), endDate: wkEnd(0), status: "pending",
      message: "Attention members! Velocity Racing Club meets this Wednesday at 3:15 PM in Room 214. We'll walk the track plan for Saturday's Regional Qualifier — the bus leaves at 7:00 AM. Everyone is welcome — see you there!",
      advisorNote: "", updatedAt: now,
      history: [{ at: now, by: "Dev Mehta", action: "Sent to Mr. Anderson for approval" }],
    },
    {
      id: "w1", weekOf: wk(1), endDate: wkEnd(1), status: "draft",
      message: "Attention members! Velocity Racing Club meets this Wednesday at 3:15 PM in Room 214. Race debrief and car tune-ups. Permission slips for State are due Tuesday! Everyone is welcome — see you there!",
      advisorNote: "", updatedAt: now, history: [],
    },
    {
      id: "w2", weekOf: wk(2), endDate: wkEnd(2), status: "draft",
      message: "", advisorNote: "", updatedAt: now, history: [],
    },
    {
      id: "w3", weekOf: wk(3), endDate: wkEnd(3), status: "skipped",
      message: "", advisorNote: "", updatedAt: now,
      history: [{ at: now, by: "Sam Rivera", action: "Skipped — no race this week" }],
    },
    {
      id: "w4", weekOf: wk(4), endDate: wkEnd(4), status: "draft",
      message: "", advisorNote: "", updatedAt: now, history: [],
    },
  ];
};

export const seedAnnouncements = (): Announcement[] => [
  { id: "a1", title: "Regional Qualifier this Saturday", body: "Bus leaves the front lot at 7:00 AM sharp. Bring water, closed-toe shoes, and your signed permission slip.", date: daysFromToday(-1), author: "Sam Rivera", pinned: true },
  { id: "a2", title: "Team shirt vote is open", body: "Nina put together three designs. Vote at Wednesday's meeting — winner gets printed for State.", date: daysFromToday(-3), author: "Dev Mehta", pinned: false },
  { id: "a3", title: "Welcome to our new members!", body: "We had 6 people join at the club fair. Say hi and help them find a pit crew.", date: daysFromToday(-9), author: "Pranav Atreya", pinned: false },
];

const NAMES: Record<string, string> = {
  u1: "Pranav Atreya", u2: "Sam Rivera", u3: "Dev Mehta", u4: "Maya Chen", u5: "Jordan Reyes", u7: "Leo Park", u10: "Nina Okafor",
};
const task = (id: string, title: string, assigneeId: string, dueIn: number, status: Task["status"], createdDaysAgo: number): Task => {
  const history: HistoryEntry[] = [
    { at: ago(createdDaysAgo, 15), by: "Dev Mehta", action: `Created and assigned to ${NAMES[assigneeId]}` },
  ];
  if (status !== "todo") history.push({ at: ago(Math.max(0, createdDaysAgo - 2), 18), by: NAMES[assigneeId], action: "Moved to In progress" });
  if (status === "done") history.push({ at: ago(Math.max(0, createdDaysAgo - 3), 19), by: NAMES[assigneeId], action: "Marked done" });
  return { id, title, assigneeId, due: daysFromToday(dueIn), status, history };
};

export const seedTasks = (): Task[] => [
  task("t1", "Submit next week's AM Wired draft", "u3", 3, "todo", 2),
  task("t2", "Book the bus for State Invitational", "u2", 5, "doing", 6),
  task("t3", "Collect permission slips", "u7", 4, "todo", 5),
  task("t4", "Post meeting recap on Schoology", "u3", -1, "todo", 4),
  task("t5", "Order team shirts", "u10", 12, "todo", 3),
  task("t6", "Update race roster", "u1", -2, "done", 8),
  task("t7", "Clean the pit-stop kit", "u5", 1, "doing", 4),
  task("t8", "Run the pit-stop drill at Wednesday's meeting", "u4", 6, "todo", 1),
  task("t9", "Bring the timing stopwatches", "u4", 2, "doing", 3),
];

export const seedResources = (): Resource[] => [
  { id: "r1", title: "Club constitution", kind: "doc", url: "https://docs.google.com", category: "Club info", addedBy: "Pranav Atreya", date: daysFromToday(-120) },
  { id: "r2", title: "Regional Qualifier track map", kind: "slides", url: "https://docs.google.com", category: "Races", addedBy: "Sam Rivera", date: daysFromToday(-4) },
  { id: "r3", title: "Pit-stop drill checklist", kind: "doc", url: "https://docs.google.com", category: "Practice", addedBy: "Maya Chen", date: daysFromToday(-10) },
  { id: "r4", title: "Race results 2025–26", kind: "sheet", url: "https://docs.google.com", category: "Races", addedBy: "Leo Park", date: daysFromToday(-30) },
  { id: "r5", title: "Schoology group", kind: "link", url: "https://www.schoology.com", category: "Club info", addedBy: "Dev Mehta", date: daysFromToday(-200) },
  { id: "r6", title: "New member onboarding", kind: "slides", url: "https://docs.google.com", category: "Club info", addedBy: "Jordan Reyes", date: daysFromToday(-15) },
  { id: "r7", title: "Budget tracker", kind: "sheet", url: "https://docs.google.com", category: "Officers", addedBy: "Leo Park", date: daysFromToday(-6) },
];
