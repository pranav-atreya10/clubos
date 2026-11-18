"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckSquare,
  ListChecks,
  Megaphone,
  MessageCircle,
  Play,
  Radio,
  ShieldCheck,
  Star,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useClub } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

/** Anything can start the walkthrough (e.g. the Help link) by firing this event. */
export const WALKTHROUGH_EVENT = "clubos:walkthrough";
export const startWalkthrough = () => window.dispatchEvent(new Event(WALKTHROUGH_EVENT));

type Slide = { icon: LucideIcon; title: string; body: string };
type Step = { target: string; title: string; body: string };

const SLIDES: Record<Role, Slide[]> = {
  admin: [
    { icon: Star, title: "Welcome, officer", body: "ClubOS keeps your club’s announcements, calendar, tasks and members in one place. All officers have the same powers." },
    { icon: Radio, title: "AM Wired, done for you", body: "Write the message, your advisor approves it, and it’s ready to send to AM Wired. No more chasing emails." },
    { icon: CheckSquare, title: "Tasks + meetings", body: "Hand out tasks (members only see their own), and plan each meeting’s agenda with a built-in timer." },
    { icon: Users, title: "Know your members", body: "Invite people with your club’s code, give private x/10 ratings, and mark board candidates. Members never see ratings." },
  ],
  advisor: [
    { icon: Star, title: "Welcome, advisor", body: "You can see everything the officers do, approve AM Wired messages, and step in when needed." },
    { icon: ShieldCheck, title: "Approve AM Wired", body: "Officers’ AM Wired messages wait in Approvals. Approve them, or send them back with a note." },
    { icon: Users, title: "Members + ratings", body: "See and edit private ratings with full history, change roles, and remove officers or members if you need to." },
    { icon: CalendarDays, title: "Post + plan", body: "Post announcements, add calendar events, see every task, and read each meeting’s agenda." },
  ],
  member: [
    { icon: Star, title: "Welcome to your club", body: "This is where your club posts what’s happening. Here’s the quick version." },
    { icon: Megaphone, title: "Stay in the loop", body: "Announcements and the calendar show what’s coming up. You can add the calendar to your phone." },
    { icon: CheckSquare, title: "Your tasks", body: "If an officer gives you a job, it shows up in Tasks. Tick it off when you’re done." },
    { icon: MessageCircle, title: "Chat + polls", body: "Ask questions, talk with the club, and vote in polls (like picking the next meeting day)." },
  ],
};

const STEPS: Record<Role, Step[]> = {
  admin: [
    { target: "new", title: "＋ New", body: "Post an announcement or add a calendar event from anywhere, in two taps." },
    { target: "nav-/app/wired", title: "AM Wired", body: "Write the daily message here. Your advisor approves it before it goes out." },
    { target: "nav-/app/tasks", title: "Tasks", body: "Assign jobs with due dates. Everyone only sees their own; you see all of them." },
    { target: "nav-/app/members", title: "Members", body: "Your invite code, roles, private ratings, and password reset links live here." },
    { target: "nav-/app/agenda", title: "Agenda", body: "Plan each meeting, then hit Run meeting for a timer that keeps you on track." },
    { target: "nav-/app/chat", title: "Chat + polls", body: "Talk with the club and run polls. A closed poll can become a meeting in one tap." },
    { target: "nav-/app/settings", title: "Settings", body: "Turn off features your club doesn’t need and pick how long each AM Wired message runs." },
    { target: "help", title: "Need this again?", body: "Replay this walkthrough any time from here." },
  ],
  advisor: [
    { target: "new", title: "＋ New", body: "Post an announcement or add a calendar event from anywhere." },
    { target: "nav-/app/approvals", title: "Approvals", body: "AM Wired messages from officers wait here. The number shows how many need you." },
    { target: "nav-/app/members", title: "Members", body: "See and edit ratings (with history), change roles, or remove someone." },
    { target: "nav-/app/tasks", title: "Tasks", body: "Every task in the club, with a history of who changed what." },
    { target: "nav-/app/agenda", title: "Agenda", body: "Read or edit the plan for each meeting. Members can’t see this." },
    { target: "help", title: "Need this again?", body: "Replay this walkthrough any time from here." },
  ],
  member: [
    { target: "nav-/app", title: "Home", body: "What’s next, pinned announcements, and your tasks at a glance." },
    { target: "nav-/app/calendar", title: "Calendar", body: "Every meeting and deadline. Tap “Add to my calendar” to get them on your phone." },
    { target: "nav-/app/tasks", title: "Your tasks", body: "Jobs officers gave you. Only you and the leaders can see them." },
    { target: "nav-/app/chat", title: "Chat", body: "Ask questions and vote in polls." },
    { target: "attendance", title: "Attendance", body: "Attendance is still taken on the school site. This opens it." },
    { target: "account", title: "Your profile", body: "Tap your name to add a profile picture." },
    { target: "help", title: "Need this again?", body: "Replay this walkthrough any time from here." },
  ],
};

const seenKey = (meId: string, role: Role) => `clubos-walkthrough-${meId}-${role}`;

/** The element a step points at, if it's on screen (the sidebar is hidden on phones). */
function findTarget(target: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(target)}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

/** Welcome slides, then an optional spotlight tour of the real sidebar. Shows once per person and role. */
export function Walkthrough() {
  const role = useClub((s) => s.role);
  const meId = useClub((s) => s.meId);
  const [mode, setMode] = useState<"off" | "slides" | "tour">("off");
  const [i, setI] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);

  const markSeen = useCallback(() => {
    try {
      if (meId) localStorage.setItem(seenKey(meId, role), "1");
    } catch {}
  }, [meId, role]);

  // First visit: show it once. Later: the Help link fires the event.
  useEffect(() => {
    if (!meId) return;
    let seen = true;
    try {
      seen = localStorage.getItem(seenKey(meId, role)) === "1";
    } catch {}
    const t = seen ? null : setTimeout(() => (setI(0), setMode("slides")), 600);
    const open = () => (setI(0), setMode("slides"));
    window.addEventListener(WALKTHROUGH_EVENT, open);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener(WALKTHROUGH_EVENT, open);
    };
  }, [meId, role]);

  const close = useCallback(() => {
    markSeen();
    setMode("off");
  }, [markSeen]);

  const startTour = () => {
    markSeen();
    // Skip steps for things this club turned off. On phones nothing is on screen, so keep all steps as cards.
    const visible = STEPS[role].filter((s) => findTarget(s.target));
    setSteps(visible.length ? visible : STEPS[role]);
    setI(0);
    setMode("tour");
  };

  useEffect(() => {
    if (mode === "off") return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [mode, close]);

  if (mode === "slides") return <Slides role={role} i={i} setI={setI} onTour={startTour} onClose={close} />;
  if (mode === "tour" && steps[i]) return <Spotlight step={steps[i]} i={i} total={steps.length} setI={setI} onClose={close} />;
  return null;
}

function Slides({ role, i, setI, onTour, onClose }: { role: Role; i: number; setI: (n: number) => void; onTour: () => void; onClose: () => void }) {
  const slides = SLIDES[role];
  const s = slides[i];
  const last = i === slides.length - 1;
  const Icon = s.icon;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Welcome to ClubOS">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-7 shadow-card">
        <button onClick={onClose} aria-label="Close walkthrough" className="absolute top-4 right-4 rounded-full p-1.5 text-faint hover:bg-surface-2 hover:text-fg">
          <X className="size-4" />
        </button>
        <span className="mb-6 inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
          <Icon className="size-6" />
        </span>
        <h2 className="font-display text-3xl leading-tight">{s.title}</h2>
        <p className="mt-2 text-muted">{s.body}</p>
        {last && (
          <a href="/demovid" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent-text underline-offset-4 hover:underline">
            <Play className="size-3.5 fill-current" /> Or watch the 43-second video
          </a>
        )}
        <div className="mt-7 flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Slide ${i + 1} of ${slides.length}`}>
            {slides.map((_, j) => (
              <span key={j} className={cn("h-1.5 rounded-full transition-all", j === i ? "w-5 bg-fg" : "w-1.5 bg-line-strong")} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <Button variant="ghost" onClick={() => setI(i - 1)} aria-label="Back">
                <ArrowLeft className="size-4" />
              </Button>
            )}
            {last ? (
              <>
                <Button onClick={onClose}>Skip</Button>
                <Button variant="accent" onClick={onTour}>
                  Show me around <ArrowRight className="size-4" />
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setI(i + 1)}>
                Next <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spotlight({ step, i, total, setI, onClose }: { step: Step; i: number; total: number; setI: (n: number) => void; onClose: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const measure = () => setRect(findTarget(step.target)?.getBoundingClientRect() ?? null);
    findTarget(step.target)?.scrollIntoView({ block: "nearest" });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.target]);

  const last = i === total - 1;
  const pad = 6;
  // Put the tip to the right of the highlighted thing (the sidebar is on the left); centered if nothing to point at.
  const tipStyle: React.CSSProperties | undefined = rect
    ? {
        left: Math.min(rect.right + 16, window.innerWidth - 336),
        top: Math.max(16, Math.min(rect.top + rect.height / 2 - 80, window.innerHeight - 200)),
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Tour: ${step.title}`}>
      {rect ? (
        <>
          <div className="absolute inset-0" onClick={onClose} />
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-accent transition-all duration-300"
            style={{
              left: rect.left - pad,
              top: rect.top - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      )}
      <div
        className={cn("absolute w-80 rounded-2xl border border-line bg-surface p-5 shadow-card", !rect && "top-1/2 left-1/2 max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2")}
        style={tipStyle}
      >
        <p className="text-xs text-faint tabular-nums">
          {i + 1} of {total}
        </p>
        <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
        <p className="mt-1 text-sm text-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-muted hover:text-fg">
            End tour
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setI(i - 1)} aria-label="Back">
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <Button size="sm" variant={last ? "accent" : "primary"} onClick={() => (last ? onClose() : setI(i + 1))}>
              {last ? "Done" : "Next"} {!last && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
