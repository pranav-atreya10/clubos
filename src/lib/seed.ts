import type {
  Announcement,
  ClubEvent,
  ClubSettings,
  Member,
  Resource,
  Task,
  WiredWeek,
} from "./types";
import { ALL_ON } from "./features";
import { addDays, daysFromToday, startOfWeek, toISODate } from "./dates";

export const DEFAULT_TEMPLATE =
  "Attention racers! {club} meets this {day}, {date}, at {time} in {room}. {details} Everyone is welcome — see you there!";

export const seedSettings = (): ClubSettings => ({
  clubName: "Velocity Racing Club",
  advisorName: "Mr. Anderson",
  advisorEmail: "anderson@school.edu",
  wiredEmail: "amwired@livingston.org",
  attendanceUrl: "https://example.com/attendance",
  meetingDay: "Wednesday",
  meetingTime: "3:15 PM",
  meetingRoom: "Room 214",
  wiredTemplate: DEFAULT_TEMPLATE,
  features: { ...ALL_ON },
});

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
  isOfficer: title !== "Member",
  joined: daysFromToday(-Math.floor(Math.random() * 400 + 20)),
  rating,
  ratingNote: note,
  boardCandidate,
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
  void template;
  return [
    {
      id: "w-1", weekOf: wk(-1), status: "sent",
      message: "Attention racers! Velocity Racing Club meets this Wednesday at 3:15 PM in Room 214. We're prepping for the Regional Qualifier — new members welcome!",
      advisorNote: "", updatedAt: now,
      history: [{ at: now, by: "Mr. Anderson", action: "Approved" }, { at: now, by: "Dev Mehta", action: "Marked as sent" }],
    },
    {
      id: "w0", weekOf: wk(0), status: "pending",
      message: "Attention racers! Velocity Racing Club meets this Wednesday at 3:15 PM in Room 214. We'll walk the track plan for Saturday's Regional Qualifier — the bus leaves at 7:00 AM. Everyone is welcome — see you there!",
      advisorNote: "", updatedAt: now,
      history: [{ at: now, by: "Dev Mehta", action: "Sent to Mr. Anderson for approval" }],
    },
    {
      id: "w1", weekOf: wk(1), status: "draft",
      message: "Attention racers! Velocity Racing Club meets this Wednesday at 3:15 PM in Room 214. Race debrief and car tune-ups. Permission slips for State are due Tuesday! Everyone is welcome — see you there!",
      advisorNote: "", updatedAt: now, history: [],
    },
    {
      id: "w2", weekOf: wk(2), status: "draft",
      message: "", advisorNote: "", updatedAt: now, history: [],
    },
    {
      id: "w3", weekOf: wk(3), status: "skipped",
      message: "", advisorNote: "", updatedAt: now,
      history: [{ at: now, by: "Sam Rivera", action: "Skipped — no race this week" }],
    },
    {
      id: "w4", weekOf: wk(4), status: "draft",
      message: "", advisorNote: "", updatedAt: now, history: [],
    },
  ];
};

export const seedAnnouncements = (): Announcement[] => [
  { id: "a1", title: "Regional Qualifier this Saturday", body: "Bus leaves the front lot at 7:00 AM sharp. Bring water, closed-toe shoes, and your signed permission slip.", date: daysFromToday(-1), author: "Sam Rivera", pinned: true },
  { id: "a2", title: "Team shirt vote is open", body: "Nina put together three designs. Vote at Wednesday's meeting — winner gets printed for State.", date: daysFromToday(-3), author: "Dev Mehta", pinned: false },
  { id: "a3", title: "Welcome to our new members!", body: "We had 6 people join at the club fair. Say hi and help them find a pit crew.", date: daysFromToday(-9), author: "Pranav Atreya", pinned: false },
];

export const seedTasks = (): Task[] => [
  { id: "t1", title: "Submit next week's AM Wired draft", assigneeId: "u3", due: daysFromToday(3), status: "todo" },
  { id: "t2", title: "Book the bus for State Invitational", assigneeId: "u2", due: daysFromToday(5), status: "doing" },
  { id: "t3", title: "Collect permission slips", assigneeId: "u7", due: daysFromToday(4), status: "todo" },
  { id: "t4", title: "Post meeting recap on Schoology", assigneeId: "u3", due: daysFromToday(-1), status: "todo" },
  { id: "t5", title: "Order team shirts", assigneeId: "u10", due: daysFromToday(12), status: "todo" },
  { id: "t6", title: "Update race roster", assigneeId: "u1", due: daysFromToday(-2), status: "done" },
  { id: "t7", title: "Clean the pit-stop kit", assigneeId: "u5", due: daysFromToday(1), status: "doing" },
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
