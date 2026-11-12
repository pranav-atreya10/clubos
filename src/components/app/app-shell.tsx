"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Lock, Menu, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useClub } from "@/lib/store";
import { clerkEnabled } from "@/lib/clerk";
import { cn } from "@/lib/cn";
import { GROUPS, NAV, canSee } from "./nav";
import { featureForPath, FEATURES } from "@/lib/features";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { ClerkIdentity, DemoIdentity, RoleSwitch } from "./identity";
import { ClubSwitcher } from "./club-switcher";
import { Onboarding } from "./onboarding";

/** Loads the club from the database, then keeps it fresh so changes from other people show up. */
function useClubData() {
  const status = useClub((s) => s.status);
  useEffect(() => {
    const { load, refresh } = useClub.getState();
    void load();
    const typing = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
    };
    const tick = () => {
      if (document.visibilityState === "visible" && !typing()) void refresh();
    };
    const id = setInterval(tick, 20_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return status;
}

function SaveError() {
  const error = useClub((s) => s.error);
  const dismiss = useClub((s) => s.dismissError);
  const status = useClub((s) => s.status);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(dismiss, 7000);
    return () => clearTimeout(t);
  }, [error, dismiss]);
  if (!error || status !== "ready") return null;
  return (
    <div role="alert" className="fixed right-4 bottom-4 left-4 z-[60] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:left-auto">
      <span className="mt-0.5 size-2 shrink-0 rounded-full bg-danger" />
      <p className="flex-1 text-sm">{error}</p>
      <button onClick={dismiss} aria-label="Dismiss" className="text-faint hover:text-fg">
        <X className="size-4" />
      </button>
    </div>
  );
}

const panel = "rounded-2xl border border-line bg-surface";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = useClub((s) => s.role);
  const wired = useClub((s) => s.wired);
  const features = useClub((s) => s.settings.features);

  const pendingApprovals = wired.filter((w) => w.status === "pending").length;
  const wiredAttention = wired.filter((w) => w.status === "changes" || w.status === "approved").length;
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col gap-2">
      <div className={cn(panel, "px-4 pt-4 pb-4")}>
        <Link href="/" onClick={onNavigate} className="inline-flex">
          <Logo />
        </Link>
        <ClubSwitcher />
      </div>

      <nav aria-label="Main" className={cn(panel, "no-scrollbar flex-1 overflow-y-auto p-2")} data-lenis-prevent>
        {GROUPS.map((g) => {
          const items = NAV.filter((n) => {
            const feat = featureForPath(n.href);
            return n.group === g && n.roles.includes(role) && (!feat || features[feat]);
          });
          const showAttendance = g === "Leaders" && role !== "member" && features.attendance;
          if (!items.length && !showAttendance) return null;
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
              {showAttendance && <AttendanceLink />}
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
  const status = useClubData();
  const ready = status === "ready";
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const role = useClub((s) => s.role);
  const clubId = useClub((s) => s.clubId);
  const clubName = useClub((s) => s.settings.clubName);
  const features = useClub((s) => s.settings.features);
  const offFeature = featureForPath(pathname);
  const turnedOff = offFeature && !features[offFeature] ? FEATURES.find((f) => f.key === offFeature) : null;

  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop: floating sidebar panels */}
      {status !== "no-club" && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[276px] p-3 lg:block">{ready && <Sidebar />}</aside>
      )}

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

      {status === "no-club" && (
        <div className="hidden items-center justify-between px-8 pt-6 lg:flex">
          <Logo />
          {clerkEnabled && <UserButton />}
        </div>
      )}
      <main className={cn(status !== "no-club" && "lg:pl-[276px]")}>
        {(ready || status === "no-club") && !clerkEnabled && (
          <div className="sticky top-14 z-20 flex justify-center px-4 pt-3 lg:top-0">
            <RoleSwitch />
          </div>
        )}
        {status === "no-club" ? (
          <Onboarding />
        ) : status === "signed-out" || status === "error" ? (
          <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-32 text-center">
            <h1 className="font-display text-4xl">{status === "signed-out" ? "Please sign in" : "Couldn’t load your club"}</h1>
            <p className="mt-2 text-sm text-muted">
              {status === "signed-out" ? "Your session ended." : "The server didn’t respond. Check your connection and try again."}
            </p>
            {status === "signed-out" ? (
              <Link href="/sign-in" className="mt-6 text-sm font-medium text-accent-text underline-offset-4 hover:underline">Sign in</Link>
            ) : (
              <button onClick={() => void useClub.getState().load()} className="mt-6 text-sm font-medium text-accent-text underline-offset-4 hover:underline">
                Try again
              </button>
            )}
          </div>
        ) : !ready ? (
          <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-8 lg:px-12">
            <div className="h-12 w-56 animate-pulse rounded-xl bg-surface-2" />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
              ))}
            </div>
          </div>
        ) : turnedOff ? (
          <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-32 text-center">
            <turnedOff.icon className="mb-4 size-6 text-faint" />
            <h1 className="font-display text-4xl">{turnedOff.label} is turned off</h1>
            <p className="mt-2 text-sm text-muted">
              {role === "admin"
                ? "Your club isn't using this feature. You can turn it back on in Settings."
                : `${clubName} isn't using this feature right now.`}
            </p>
            <Link
              href={role === "admin" ? "/app/settings#features" : "/app"}
              className="mt-6 text-sm font-medium text-accent-text underline-offset-4 hover:underline"
            >
              {role === "admin" ? "Open Settings" : "Back to home"}
            </Link>
          </div>
        ) : canSee(role, pathname) ? (
          <div key={`${pathname}-${role}-${clubId}`}>{children}</div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-32 text-center">
            <Lock className="mb-4 size-6 text-faint" />
            <h1 className="font-display text-4xl">{pathname.startsWith("/app/approvals") ? "For the advisor" : "Officers only"}</h1>
            <p className="mt-2 text-sm text-muted">
              {pathname.startsWith("/app/approvals")
                ? `Only ${clubName}'s advisor approves AM Wired messages.`
                : `This part of ${clubName} is only visible to club leaders.`}
            </p>
            <Link href="/app" className="mt-6 text-sm font-medium text-accent-text underline-offset-4 hover:underline">
              Back to home
            </Link>
          </div>
        )}
      </main>
      <SaveError />
    </div>
  );
}
