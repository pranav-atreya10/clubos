import { CalendarDays, CheckSquare, ClipboardCheck, FolderOpen, Megaphone, Radio, Star, type LucideIcon } from "lucide-react";

export type FeatureKey = "wired" | "announcements" | "calendar" | "tasks" | "resources" | "ratings" | "attendance";

export type Features = Record<FeatureKey, boolean>;

export const FEATURES: { key: FeatureKey; label: string; body: string; icon: LucideIcon }[] = [
  { key: "wired", label: "AM Wired", body: "Plan morning announcements and get advisor approval.", icon: Radio },
  { key: "announcements", label: "Announcements", body: "A news feed for members.", icon: Megaphone },
  { key: "calendar", label: "Calendar", body: "Meetings, races, and deadlines.", icon: CalendarDays },
  { key: "tasks", label: "Tasks", body: "Assign jobs with due dates.", icon: CheckSquare },
  { key: "resources", label: "Resources", body: "Shared docs, slides, and links.", icon: FolderOpen },
  { key: "ratings", label: "Leadership ratings", body: "Private x/10 scores and board candidates on Members.", icon: Star },
  { key: "attendance", label: "Attendance link", body: "A menu shortcut to the school's attendance site.", icon: ClipboardCheck },
];

export const ALL_ON: Features = {
  wired: true,
  announcements: true,
  calendar: true,
  tasks: true,
  resources: true,
  ratings: true,
  attendance: true,
};

/** Which feature (if any) a page belongs to. Home, Members, and Settings are always on. */
export const featureForPath = (path: string): FeatureKey | null => {
  if (path.startsWith("/app/wired") || path.startsWith("/app/approvals")) return "wired";
  if (path.startsWith("/app/announcements")) return "announcements";
  if (path.startsWith("/app/calendar")) return "calendar";
  if (path.startsWith("/app/tasks")) return "tasks";
  if (path.startsWith("/app/resources")) return "resources";
  return null;
};
