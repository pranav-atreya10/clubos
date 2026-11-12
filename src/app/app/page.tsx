"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { useClub } from "@/lib/store";
import { daysFromToday, daysUntil, fmtLong, relativeDay, startOfWeek, toISODate } from "@/lib/dates";
import { statusMeta, weekRange } from "@/lib/wired";
import { cn } from "@/lib/cn";
import { Page, SectionTitle, Card } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AnnouncementItem, EventCard } from "@/components/app/bits";
import SplitText from "@/components/reactbits/SplitText";
import CountUp from "@/components/reactbits/CountUp";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

function WiredCallout() {
  const wired = useClub((s) => s.wired);
  const advisor = useClub((s) => s.settings.advisorName);
  const thisWeek = toISODate(startOfWeek(new Date()));
  const w = wired.find((x) => x.weekOf === thisWeek);
  const next = wired
    .filter((x) => x.weekOf > thisWeek && x.status !== "skipped")
    .sort((a, b) => a.weekOf.localeCompare(b.weekOf))[0];

  const copy: Record<string, { title: string; body: string; cta: string }> = {
    draft: { title: "This week's AM Wired hasn't been sent for approval", body: `Send it to ${advisor} so it makes the morning announcements.`, cta: "Finish draft" },
    pending: { title: `Waiting on ${advisor}`, body: "You'll see it here the moment it's approved or needs edits.", cta: "View message" },
    changes: { title: `${advisor} asked for changes`, body: "Make the edits and resend — it only takes a minute.", cta: "Make edits" },
    approved: { title: "Approved — ready to send to AM Wired", body: "Open it in your email app and hit send.", cta: "Send now" },
    sent: { title: "This week's announcement is out", body: next ? `Next up: week of ${weekRange(next.weekOf)} (${statusMeta[next.status].label.toLowerCase()}).` : "Nothing else queued.", cta: "Plan ahead" },
    skipped: { title: "Skipping AM Wired this week", body: "No announcement will go out.", cta: "Change" },
  };
  const state = w ? copy[w.status] : copy.draft;
  const urgent = !w || w.status === "draft" || w.status === "changes" || w.status === "approved";

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden p-6 sm:flex-row sm:items-center sm:justify-between",
        urgent && "border-transparent bg-accent text-accent-fg",
      )}
    >
      <div className="flex items-start gap-4">
        <span className={cn("mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full", urgent ? "bg-white/15" : "bg-accent-soft text-accent-text")}>
          <Radio className="size-5" />
        </span>
        <div>
          <p className={cn("mb-1 text-xs font-medium tracking-wide uppercase", urgent ? "text-accent-fg/70" : "text-muted")}>
            AM Wired · week of {weekRange(thisWeek)}
          </p>
          <p className="text-lg font-semibold leading-snug">{state.title}</p>
          <p className={cn("mt-1 text-sm", urgent ? "text-accent-fg/80" : "text-muted")}>{state.body}</p>
        </div>
      </div>
      <Link href={w ? `/app/wired?week=${w.id}` : "/app/wired"}>
        <Button variant={urgent ? "onAccent" : "primary"}>
          {state.cta} <ArrowRight className="size-4" />
        </Button>
      </Link>
    </Card>
  );
}

function Stat({ label, value, suffix, sub }: { label: string; value: number; suffix?: string; sub?: string }) {
  return (
    <div data-reveal className="min-w-0 border-line py-1 sm:border-l sm:pl-6 sm:first:border-l-0 sm:first:pl-0">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-[28px] font-semibold tracking-tight tabular-nums">
        <CountUp to={value} duration={1.2} />
        {suffix && <span className="text-lg font-medium text-muted">{suffix}</span>}
      </p>
      {sub && <p className="truncate text-xs text-faint">{sub}</p>}
    </div>
  );
}

export default function HomePage() {
  const role = useClub((s) => s.role);
  const name = useClub((s) => s.userName);
  const club = useClub((s) => s.settings);
  const events = useClub((s) => s.events);
  const members = useClub((s) => s.members);
  const tasks = useClub((s) => s.tasks);
  const announcements = useClub((s) => s.announcements);
  const wired = useClub((s) => s.wired);
  const setTaskStatus = useClub((s) => s.setTaskStatus);
  const on = useClub((s) => s.settings.features);
  const meId = useClub((s) => s.meId);
  const me = members.find((m) => m.id === meId);

  const today = daysFromToday(0);
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const nextMeeting = upcoming.find((e) => e.type === "meeting");
  const nextRace = upcoming.find((e) => e.type === "race");
  const openTasks = tasks.filter((t) => t.status !== "done");
  const myTasks = role === "member" ? openTasks.filter((t) => t.assigneeId === me?.id) : openTasks;
  const sortedAnn = [...announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date));
  const pending = wired.filter((w) => w.status === "pending");
  const first = name.replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, "").split(" ")[0];
  const showAnnouncements = on.announcements;
  const showSide = role === "advisor" || on.tasks;
  const statCount = 1 + Number(on.calendar) + Number(on.tasks) + Number(on.ratings);
  const statCols = ["sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4"][statCount - 1];
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? "Unassigned";

  return (
    <Page>
      <header className="mb-10">
        <p data-reveal className="mb-3 text-sm text-muted">
          {club.clubName} · {fmtLong(today)}
        </p>
        <SplitText
          key={name}
          text={`${greeting()}, ${role === "advisor" ? name : first}.`}
          tag="h1"
          textAlign="left"
          splitType="words"
          effect="blur"
          delay={60}
          duration={0.9}
          className="font-display text-[44px] leading-[1.02] tracking-tight sm:text-[60px]"
        />
      </header>

      <div className="space-y-12">
        {role === "admin" && on.wired && <WiredCallout />}

        {role === "advisor" && on.wired && (
          <Card className={cn("flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between", pending.length > 0 && "border-transparent bg-accent text-accent-fg")}>
            <div className="flex items-start gap-4">
              <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full", pending.length ? "bg-white/15" : "bg-accent-soft text-accent-text")}>
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-lg font-semibold">
                  {pending.length ? `${pending.length} AM Wired ${pending.length === 1 ? "message" : "messages"} waiting for you` : "You're all caught up"}
                </p>
                <p className={cn("mt-1 text-sm", pending.length ? "text-accent-fg/80" : "text-muted")}>
                  {pending.length ? "Approve as-is, make a quick edit, or send it back with a note." : "New announcements from officers will show up here."}
                </p>
              </div>
            </div>
            {pending.length > 0 && (
              <Link href="/app/approvals">
                <Button variant="onAccent">
                  Review <ArrowRight className="size-4" />
                </Button>
              </Link>
            )}
          </Card>
        )}

        {role === "member" && on.calendar && nextMeeting && (
          <Card className="relative overflow-hidden border-transparent bg-fg p-7 text-bg">
            <Sparkles className="absolute top-6 right-6 size-5 opacity-40" />
            <p className="text-xs font-medium tracking-wide uppercase opacity-60">Next meeting · {relativeDay(nextMeeting.date)}</p>
            <p className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{fmtLong(nextMeeting.date)}</p>
            <p className="mt-2 text-sm opacity-70">
              {nextMeeting.time} · {nextMeeting.location}
              {nextMeeting.notes && ` · ${nextMeeting.notes}`}
            </p>
          </Card>
        )}

        {role !== "member" && statCount > 1 && (
          <section className={cn("grid grid-cols-2 gap-x-6 gap-y-6", statCols)}>
            <Stat label="Members" value={members.length} sub={`${members.filter((m) => m.isOfficer).length} officers`} />
            {on.calendar && (
              <Stat label="Next meeting" value={nextMeeting ? Math.max(0, daysUntil(nextMeeting.date)) : 0} suffix=" days" sub={nextMeeting?.location} />
            )}
            {on.tasks && <Stat label="Open tasks" value={openTasks.length} sub={`${openTasks.filter((t) => t.due < today).length} overdue`} />}
            {on.ratings && (
              <Stat
                label="Board candidates"
                value={members.filter((m) => m.boardCandidate).length}
                sub={on.calendar && nextRace ? `Next race: ${nextRace.title}` : undefined}
              />
            )}
          </section>
        )}

        {on.calendar && (
        <section>
          <SectionTitle action={<Link href="/app/calendar" className="text-sm font-medium text-accent-text hover:underline underline-offset-4">View all</Link>}>
            Coming up
          </SectionTitle>
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {upcoming.slice(0, 4).map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </section>
        )}

        {(showAnnouncements || showSide) && (
        <div className={cn("grid grid-cols-1 gap-12 [&>*]:min-w-0", showAnnouncements && showSide && "lg:grid-cols-[1.4fr_1fr]")}>
          {showAnnouncements && (
          <section>
            <SectionTitle action={<Link href="/app/announcements" className="text-sm font-medium text-accent-text hover:underline underline-offset-4">View all</Link>}>
              Announcements
            </SectionTitle>
            <Card className="divide-y divide-line p-6">
              {sortedAnn.slice(0, 3).map((a) => (
                <AnnouncementItem key={a.id} a={a} />
              ))}
            </Card>
          </section>
          )}

          {role !== "advisor" && on.tasks && (
            <section>
              <SectionTitle action={<Link href="/app/tasks" className="text-sm font-medium text-accent-text hover:underline underline-offset-4">View all</Link>}>
                {role === "member" ? "Your tasks" : "Due soon"}
              </SectionTitle>
              <Card className="p-2">
                {myTasks.length === 0 && <p className="p-4 text-sm text-muted">Nothing on your plate. Nice.</p>}
                {myTasks
                  .sort((a, b) => a.due.localeCompare(b.due))
                  .slice(0, 5)
                  .map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-surface-2">
                      <button
                        aria-label={`Mark "${t.title}" done`}
                        onClick={() => setTaskStatus(t.id, "done")}
                        className="text-faint transition-colors hover:text-accent-text"
                      >
                        <Circle className="size-5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        {role === "admin" && <p className="text-xs text-muted">{memberName(t.assigneeId)}</p>}
                      </div>
                      <Badge tone={t.due < today ? "danger" : t.status === "doing" ? "accent" : "muted"}>
                        {t.due < today ? "Overdue" : relativeDay(t.due)}
                      </Badge>
                    </div>
                  ))}
                {role === "admin" && (
                  <div className="mt-1 flex items-center gap-2 border-t border-line px-3 pt-3 pb-1 text-xs text-muted">
                    <CheckCircle2 className="size-3.5 text-accent-text" />
                    {tasks.filter((t) => t.status === "done").length} done this month
                  </div>
                )}
              </Card>
            </section>
          )}

          {role === "advisor" && (
            <section>
              <SectionTitle>Officers</SectionTitle>
              <Card className="p-2">
                {members.filter((m) => m.isOfficer).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl p-3">
                    <Avatar name={m.name} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted">{m.title}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>
        )}

        {role === "member" && !on.calendar && !on.announcements && !on.tasks && (
          <p data-reveal className="text-sm text-muted">Nothing new right now. Check back after the next meeting.</p>
        )}
      </div>
    </Page>
  );
}
