import {
  CalendarDays,
  CheckSquare,
  FolderOpen,
  Home,
  Megaphone,
  Radio,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export type NavGroup = "Club" | "Communicate" | "Leaders";
export type NavItem = { href: string; label: string; icon: LucideIcon; roles: Role[]; group: NavGroup };
export const GROUPS: NavGroup[] = ["Club", "Communicate", "Leaders"];

export const NAV: NavItem[] = [
  { href: "/app", group: "Club", label: "Home", icon: Home, roles: ["admin", "advisor", "member"] },
  { href: "/app/approvals", group: "Communicate", label: "Approvals", icon: ShieldCheck, roles: ["advisor"] },
  { href: "/app/wired", group: "Communicate", label: "AM Wired", icon: Radio, roles: ["admin"] },
  { href: "/app/announcements", group: "Communicate", label: "Announcements", icon: Megaphone, roles: ["admin", "advisor", "member"] },
  { href: "/app/calendar", group: "Club", label: "Calendar", icon: CalendarDays, roles: ["admin", "advisor", "member"] },
  { href: "/app/tasks", group: "Club", label: "Tasks", icon: CheckSquare, roles: ["admin", "advisor", "member"] },
  { href: "/app/members", group: "Leaders", label: "Members", icon: Users, roles: ["admin", "advisor"] },
  { href: "/app/resources", group: "Club", label: "Resources", icon: FolderOpen, roles: ["admin", "advisor", "member"] },
  { href: "/app/settings", group: "Leaders", label: "Settings", icon: Settings, roles: ["admin"] },
];

export const canSee = (role: Role, href: string) => {
  const item = [...NAV].sort((a, b) => b.href.length - a.href.length).find((n) => href.startsWith(n.href));
  return item ? item.roles.includes(role) : true;
};
