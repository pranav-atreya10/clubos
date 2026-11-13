"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { gsap } from "gsap";
import {
  ArrowUpRight,
  Ban,
  Check,
  Copy,
  Mail,
  Plus,
  RotateCcw,
  Send,
  Undo2,
  Wand2,
} from "lucide-react";
import { useClub } from "@/lib/store";
import { eventsInRange, mailtoFor, statusMeta, weekRange, cap, currentSlot } from "@/lib/wired";
import { fmt } from "@/lib/dates";
import { Page, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import { WeekList } from "@/components/wired/week-list";
import { History } from "@/components/wired/history";
import { eventLabel } from "@/components/app/bits";

function WiredInner() {
  const router = useRouter();
  const params = useSearchParams();
  const s = useClub();
  const weeks = useMemo(() => [...s.wired].sort((a, b) => a.weekOf.localeCompare(b.weekOf)), [s.wired]);
  const fallback = currentSlot(weeks)?.id ?? weeks[0]?.id;
  const selectedId = params.get("week") ?? fallback;
  const w = weeks.find((x) => x.id === selectedId);
  const panel = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!panel.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(panel.current, { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" });
  }, [selectedId]);

  const select = (id: string) => router.replace(`/app/wired?week=${id}`, { scroll: false });

  if (!w) return null;
  const meta = statusMeta[w.status];
  const editable = w.status === "draft" || w.status === "changes";
  const words = w.message.trim() ? w.message.trim().split(/\s+/).length : 0;
  const seconds = Math.round(words / 2.6);
  const calendarOn = s.settings.features.calendar;
  const weekEvents = eventsInRange(s.events, w.weekOf, w.endDate);
  const hasRace = weekEvents.some((e) => e.type === "race");

  const copy = async () => {
    await navigator.clipboard.writeText(w.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Page className="max-w-7xl">
      <PageHeader
        title="AM Wired"
        subtitle={
          <>
            Plan your morning announcements ahead. {cap(s.settings.advisorName)} approves them here, then you send
            the final version to <span className="font-medium text-fg">{s.settings.wiredEmail}</span> in one click.
          </>
        }
        actions={
          <Button onClick={s.wiredAddWeek}>
            <Plus className="size-4" /> Add another
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr] [&>*]:min-w-0">
        <aside data-reveal className="lg:sticky lg:top-8 lg:self-start">
          <WeekList weeks={weeks} selected={w.id} onSelect={select} />
        </aside>

        <div ref={panel} className="rounded-3xl border border-line bg-surface p-5 sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{w.endDate && w.endDate !== w.weekOf ? "Covers" : "For"}</p>
              <h2 className="font-display text-4xl leading-tight">{weekRange(w)}</h2>
            </div>
            <Badge tone={meta.tone} dot className="mt-1 text-[13px]">
              {meta.label}
            </Badge>
          </div>

          {w.status === "changes" && w.advisorNote && (
            <div className="mb-6 rounded-2xl bg-danger-soft p-4 text-sm">
              <p className="mb-1 font-semibold text-danger">{cap(s.settings.advisorName)} says:</p>
              <p className="text-fg">“{w.advisorNote}”</p>
            </div>
          )}

          {w.status === "skipped" ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
              <Ban className="mb-3 size-6 text-faint" />
              <p className="font-medium">No announcement this week</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                Skipped weeks won’t remind anyone. Changed your mind?
              </p>
              <Button className="mt-5" onClick={() => s.wiredUnskip(w.id)}>
                <RotateCcw className="size-4" /> Un-skip
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Textarea
                  aria-label="Announcement message"
                  value={w.message}
                  readOnly={!editable}
                  onChange={(e) => s.wiredEdit(w.id, e.target.value)}
                  placeholder="Write the announcement, or auto-fill it from this week’s calendar…"
                  rows={7}
                  className={!editable ? "cursor-default bg-bg-subtle text-[17px]" : "text-[17px]"}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
                <span className="tabular-nums">
                  {words} words · about {seconds}s read aloud
                </span>
                {editable && (
                  <button
                    onClick={() => s.wiredGenerate(w.id)}
                    className="inline-flex items-center gap-1.5 font-medium text-accent-text hover:underline underline-offset-4"
                  >
                    <Wand2 className="size-3.5" /> {calendarOn ? "Auto-fill from calendar" : "Auto-fill draft"}
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-2">
                {editable && (
                  <>
                    <Button variant="accent" disabled={!w.message.trim()} onClick={() => s.wiredSubmit(w.id)}>
                      <Send className="size-4" /> Send to {s.settings.advisorName}
                    </Button>
                    <Button variant="ghost" onClick={() => s.wiredSkip(w.id)}>
                      Skip this week
                    </Button>
                  </>
                )}
                {w.status === "pending" && (
                  <>
                    <p className="flex items-center text-sm text-muted">
                      {cap(s.settings.advisorName)} can approve it from their advisor account.
                    </p>
                    <Button variant="ghost" onClick={() => s.wiredRecall(w.id)}>
                      <Undo2 className="size-4" /> Pull back to edit
                    </Button>
                  </>
                )}
                {w.status === "approved" && (
                  <>
                    <a href={mailtoFor(s.settings, w, w.message)}>
                      <Button variant="accent">
                        <Mail className="size-4" /> Open in email app
                      </Button>
                    </a>
                    <Button onClick={copy}>
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy text"}
                    </Button>
                    <Button variant="ghost" onClick={() => s.wiredMarkSent(w.id)}>
                      <Check className="size-4" /> Mark as sent
                    </Button>
                  </>
                )}
                {w.status === "sent" && (
                  <Button onClick={copy}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy text"}
                  </Button>
                )}
              </div>
              {w.status === "approved" && (
                <p className="mt-3 text-xs text-faint">
                  Opens a ready-to-send email from your own account — ClubOS never needs access to your school Gmail.
                </p>
              )}
            </>
          )}

          <div className="my-8 h-px bg-line" />

          <div className={calendarOn ? "grid gap-8 sm:grid-cols-2" : ""}>
            {calendarOn && (
            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">On the calendar</p>
              {weekEvents.length === 0 ? (
                <p className="text-sm text-muted">Nothing scheduled. Good week to skip?</p>
              ) : (
                <ul className="space-y-2.5">
                  {weekEvents.map((e) => (
                    <li key={e.id} className="flex items-baseline gap-3 text-sm">
                      <span className="w-10 shrink-0 text-xs font-medium text-faint uppercase">{fmt(e.date, { weekday: "short" })}</span>
                      <span className="min-w-0">
                        <span className="font-medium">{e.title}</span>
                        <span className="text-muted"> · {eventLabel[e.type]}, {e.time}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!hasRace && w.status === "draft" && weekEvents.length > 0 && (
                <p className="mt-3 text-xs text-faint">No race then — you can skip if there’s nothing to announce.</p>
              )}
            </div>
            )}
            <History items={w.history} />
          </div>
        </div>
      </div>

      <p data-reveal className="mt-8 flex items-center gap-1.5 text-xs text-faint">
        Change the wording template or AM Wired email in{" "}
        <a href="/app/settings" className="inline-flex items-center font-medium text-muted hover:text-fg">
          Settings <ArrowUpRight className="size-3" />
        </a>
      </p>
    </Page>
  );
}

export default function WiredPage() {
  return (
    <Suspense>
      <WiredInner />
    </Suspense>
  );
}
