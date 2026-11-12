"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles, User } from "lucide-react";
import { enterDemo } from "@/server/auth-actions";
import { cn } from "@/lib/cn";

const PEOPLE = [
  {
    id: "demo-officer",
    role: "Officer",
    name: "Dev Mehta",
    icon: Sparkles,
    does: ["Plan AM Wired weeks ahead", "Rate members for the board", "Assign tasks, turn features on/off"],
    accent: true,
  },
  {
    id: "demo-advisor",
    role: "Advisor",
    name: "Mr. Anderson",
    icon: ShieldCheck,
    does: ["Approve or edit AM Wired", "Post announcements", "See tasks and ratings"],
  },
  {
    id: "demo-member",
    role: "Member",
    name: "Maya Chen",
    icon: User,
    does: ["See what's coming up", "Check off your own tasks", "Find club docs and links"],
  },
];

export function DemoPicker() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const go = async (id: string) => {
    setBusy(id);
    await enterDemo(id).catch(() => null);
    router.push("/app");
    router.refresh();
  };
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PEOPLE.map(({ id, role, name, icon: Icon, does, accent }) => (
        <button
          key={id}
          onClick={() => go(id)}
          disabled={busy !== null}
          className={cn(
            "group flex flex-col rounded-3xl border p-6 text-left transition-[transform,border-color] duration-300 hover:-translate-y-1 disabled:opacity-60",
            accent ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface hover:border-line-strong",
          )}
        >
          <span className={cn("mb-8 inline-flex size-10 items-center justify-center rounded-xl", accent ? "bg-white/15" : "bg-surface-2")}>
            <Icon className="size-5" />
          </span>
          <span className={cn("text-xs font-medium tracking-wide uppercase", accent ? "text-accent-fg/70" : "text-muted")}>{role}</span>
          <span className="mt-1 font-display text-3xl leading-tight">{name}</span>
          <ul className={cn("mt-4 mb-8 space-y-1.5 text-sm", accent ? "text-accent-fg/85" : "text-muted")}>
            {does.map((d) => (
              <li key={d}>· {d}</li>
            ))}
          </ul>
          <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium">
            {busy === id ? "Opening…" : `Try as ${role.toLowerCase()}`}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      ))}
    </div>
  );
}
