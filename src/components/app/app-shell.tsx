"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Lock, Menu, X } from "lucide-react";
import { useClub } from "@/lib/store";
import { clerkEnabled } from "@/lib/clerk";
import { cn } from "@/lib/cn";
import { GROUPS, NAV, canSee } from "./nav";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { ClerkIdentity, DemoIdentity, RoleSwitch } from "./identity";

function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.resolve(useClub.persist.rehydrate()).then(() => setReady(true));
  }, []);
  return ready;
}

const panel = "rounded-2xl border border-line bg-surface";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = useClub((s) => s.role);
  const wired = useClub((s) => s.wired);
  const club = useClub((s) => s.settings.clubName);

  const pendingApprovals = wired.filter((w) => w.status === "pending").length;
  const wiredAttention = wired.filter((w) => w.status === "changes" || w.status === "approved").length;
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col gap-2">
      <div className={cn(panel, "px-4 pt-4 pb-4")}>
        <Link href="/" onClick={onNavigate} className="inline-flex">
          <Logo />
        </Link>
        <p className="mt-4 text-xs text-faint">Your club</p>
        <p className="truncate text-[17px] font-medium tracking-tight">{club}</p>
      </div>

      <nav aria-label="Main" className={cn(panel, "no-scrollbar flex-1 overflow-y-auto p-2")} data-lenis-prevent>
        {GROUPS.map((g) => {
          const items = NAV.filter((n) => n.group === g && n.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={g} className="mb-2 last:mb-0">
              <p className="px-2.5 pt-2 pb-1.5 text-xs text-faint">{g}</p>
              {items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                const count = href === "/app/approvals" ? pendingApprovals : href === "/app/wired" ? wiredAttention : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center gap-2.5 rounded-xl px-1.5 text-[14px] transition-colors",
                      active ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-lg border transition-colors",
                        active ? "border-transparent bg-fg text-bg" : "border-line bg-surface",
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    {label}
                    {count > 0 && (
                      <span className="mr-1 ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg tabular-nums">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
              {g === "Leaders" && role !== "member" && <AttendanceLink />}
            </div>
          );
        })}
      </nav>

      <div className={cn(panel, "space-y-3 p-3")}>
        {clerkEnabled ? <ClerkIdentity /> : <DemoIdentity />}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-faint">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function AttendanceLink() {
  const url = useClub((s) => s.settings.attendanceUrl);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex h-10 items-center gap-2.5 rounded-xl px-1.5 text-[14px] text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <span className="inline-flex size-7 items-center justify-center rounded-lg border border-line bg-surface">
        <ArrowUpRight className="size-3.5" />
      </span>
      Attendance
      <span className="mr-1 ml-auto text-[11px] text-faint">school site</span>
    </a>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const ready = useHydrated();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const role = useClub((s) => s.role);
  const clubName = useClub((s) => s.settings.clubName);

  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop: floating sidebar panels */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[276px] p-3 lg:block">{ready && <Sidebar />}</aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur-md lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-full p-2 text-fg hover:bg-surface-2">
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" data-lenis-prevent>
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[288px] bg-bg p-3">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-6 right-6 z-10 rounded-full p-1.5 text-muted hover:bg-surface-2"
            >
              <X className="size-4" />
            </button>
            {ready && <Sidebar onNavigate={() => setOpen(false)} />}
          </div>
        </div>
      )}

      <main className="lg:pl-[276px]">
        {ready && !clerkEnabled && (
          <div className="sticky top-14 z-20 flex justify-center px-4 pt-3 lg:top-0">
            <RoleSwitch />
          </div>
        )}
        {!ready ? (
          <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-8 lg:px-12">
            <div className="h-12 w-56 animate-pulse rounded-xl bg-surface-2" />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
              ))}
            </div>
          </div>
        ) : canSee(role, pathname) ? (
          <div key={`${pathname}-${role}`}>{children}</div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-32 text-center">
            <Lock className="mb-4 size-6 text-faint" />
            <h1 className="font-display text-4xl">Officers only</h1>
            <p className="mt-2 text-sm text-muted">This part of {clubName} is only visible to club leaders.</p>
            <Link href="/app" className="mt-6 text-sm font-medium text-accent-text underline-offset-4 hover:underline">
              Back to home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
