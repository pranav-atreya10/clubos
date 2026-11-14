"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Play, X } from "lucide-react";
import { useClub } from "@/lib/store";
import { cn } from "@/lib/cn";

const KEY = (clubId: string) => `clubos-getting-started-${clubId}`;

/** A short, self-checking setup list so new clubs know where to start. Dismissable per club. */
export function GettingStarted() {
  const s = useClub();
  const [hidden, setHidden] = useState(true);
  const [watched, setWatched] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHidden(localStorage.getItem(KEY(s.clubId ?? "")) === "hidden");
      setWatched(localStorage.getItem("clubos-watched-tour") === "1");
    } catch {
      setHidden(false);
    }
  }, [s.clubId]);
  if (hidden || !s.clubId) return null;

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY(s.clubId ?? ""), "hidden");
    } catch {}
  };
  const watch = () => {
    setWatched(true);
    try {
      localStorage.setItem("clubos-watched-tour", "1");
    } catch {}
  };

  const leader = s.role === "admin" || s.role === "advisor";
  const steps = leader
    ? [
        { done: watched, label: "Watch the 43-second tour", href: "/demovid", onClick: watch, external: true },
        { done: s.members.length > 1, label: "Invite your club with the invite code", href: "/app/settings#invite" },
        { done: s.members.some((m) => m.role === "advisor"), label: "Make your advisor “Advisor” in Members", href: "/app/members" },
        { done: s.events.length > 0, label: "Add your next meeting to the calendar", href: "/app/calendar" },
        { done: s.wired.some((w) => w.message.trim()), label: "Write your first AM Wired message", href: "/app/wired" },
      ]
    : [
        { done: watched, label: "Watch the 43-second tour", href: "/demovid", onClick: watch, external: true },
        { done: false, label: "Check what’s coming up on the Calendar", href: "/app/calendar" },
        { done: false, label: "Say hi or ask a question in Chat", href: "/app/chat" },
        { done: false, label: "Add your profile picture", href: "/app/profile" },
      ];
  const left = steps.filter((x) => !x.done).length;
  if (leader && left === 0) return null;

  return (
    <div data-reveal className="relative rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <button onClick={hide} aria-label="Hide getting started" className="absolute top-4 right-4 rounded-full p-1.5 text-faint hover:bg-surface-2 hover:text-fg">
        <X className="size-4" />
      </button>
      <p className="text-xs font-medium tracking-wide text-accent-text uppercase">{leader ? "Getting started" : "New here?"}</p>
      <p className="mt-1 mb-4 text-lg font-semibold">{leader ? `${left} step${left === 1 ? "" : "s"} to set up your club` : "A few things to try"}</p>
      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map((x) => (
          <li key={x.label}>
            <Link
              href={x.href}
              onClick={x.onClick}
              target={x.external ? "_blank" : undefined}
              className={cn("flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:border-line-strong", x.done && "text-muted line-through")}
            >
              <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full border", x.done ? "border-transparent bg-accent text-accent-fg" : "border-line-strong")}>
                {x.done ? <Check className="size-3" strokeWidth={3} /> : x.external ? <Play className="size-2.5 fill-current" /> : null}
              </span>
              {x.label}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
