"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { exitDemo, signOut } from "@/server/auth-actions";
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

/** Your name, your role in this club, and a way out (sign out, or leave the demo). */
export function AccountCard() {
  const router = useRouter();
  const role = useClub((s) => s.role);
  const name = useClub((s) => s.userName);
  const demo = useClub((s) => s.demo);
  const hasClub = useClub((s) => s.clubId !== null);
  const [busy, setBusy] = useState(false);
  const leave = async () => {
    setBusy(true);
    await (demo ? exitDemo() : signOut()).catch(() => null);
    router.replace(demo ? "/demo" : "/sign-in");
    router.refresh();
  };
  return (
    <div className="flex items-center gap-3 px-1">
      <Avatar name={name || "?"} accent={role === "advisor"} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted">
          {hasClub ? roleLabel(role) : "No club yet"}
          {demo && " · demo"}
        </p>
      </div>
      <button
        onClick={leave}
        disabled={busy}
        title={demo ? "Exit demo" : "Sign out"}
        aria-label={demo ? "Exit demo" : "Sign out"}
        className="rounded-full p-2 text-faint transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40"
      >
        <LogOut className="size-4" />
      </button>
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
