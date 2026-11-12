"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useClub } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";

const ROLES: { v: Role; label: string }[] = [
  { v: "admin", label: "Officer" },
  { v: "advisor", label: "Advisor" },
  { v: "member", label: "Member" },
];

export const roleLabel = (r: Role) => ROLES.find((x) => x.v === r)!.label;

/** With Clerk: name and picture from Clerk; the role comes from the club (set by officers in Members). */
export function ClerkIdentity() {
  const { user } = useUser();
  const role = useClub((s) => s.role);
  const hasClub = useClub((s) => s.clubId !== null);
  return (
    <div className="flex items-center gap-3 px-2">
      <UserButton />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium">{user?.fullName ?? "…"}</p>
        {hasClub && <p className="text-xs text-muted">{roleLabel(role)}</p>}
      </div>
    </div>
  );
}

/** Demo mode: who you are (role is switched from the top bar). */
export function DemoIdentity() {
  const role = useClub((s) => s.role);
  const name = useClub((s) => s.userName);
  return (
    <div className="flex items-center gap-3 px-1">
      <Avatar name={name} accent={role === "advisor"} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted">{roleLabel(role)} · demo</p>
      </div>
    </div>
  );
}

/** Floating segmented "view as" switch — demo mode only. */
export function RoleSwitch() {
  const role = useClub((s) => s.role);
  const setDemoRole = useClub((s) => s.setDemoRole);
  return (
    <div role="radiogroup" aria-label="View as" className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-1 shadow-card">
      <span className="hidden px-3 text-xs text-faint sm:inline">View as</span>
      {ROLES.map((r) => (
        <button
          key={r.v}
          role="radio"
          aria-checked={role === r.v}
          onClick={() => role !== r.v && setDemoRole(r.v)}
          className={cn(
            "h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors",
            role === r.v ? "bg-fg text-bg" : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
