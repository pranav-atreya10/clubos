"use client";

import { RotateCcw } from "lucide-react";
import { useClub } from "@/lib/store";
import { DEFAULT_TEMPLATE } from "@/lib/seed";
import type { ClubSettings } from "@/lib/types";
import { Page, PageHeader, Card } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { DAY_OPTIONS } from "@/lib/wired";
import { InviteCode } from "@/components/app/invite-code";
import { FEATURES } from "@/lib/features";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

function Field({ k, label, hint, type = "text" }: { k: Exclude<keyof ClubSettings, "features" | "wiredDays">; label: string; hint?: string; type?: string }) {
  const value = useClub((s) => s.settings[k]);
  const update = useClub((s) => s.updateSettings);
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <Input type={type} value={value} onChange={(e) => update({ [k]: e.target.value })} />
    </label>
  );
}

function Section({ id, title, body, children }: { id?: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="grid gap-6 p-6 sm:p-8 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const template = useClub((s) => s.settings.wiredTemplate);
  const wiredDays = useClub((s) => s.settings.wiredDays);
  const advisorName = useClub((s) => s.settings.advisorName);
  const update = useClub((s) => s.updateSettings);
  const reset = useClub((s) => s.resetDemo);
  const demo = useClub((s) => s.demo);
  const features = useClub((s) => s.settings.features);
  const setFeature = useClub((s) => s.setFeature);
  const onCount = FEATURES.filter((f) => features[f.key]).length;

  return (
    <Page className="max-w-4xl">
      <PageHeader title="Settings" subtitle="Changes save automatically." />
      <div className="space-y-4">
        <Section title="Club" body="The basics members see everywhere.">
          <Field k="clubName" label="Club name" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field k="meetingDay" label="Usual day" />
            <Field k="meetingTime" label="Time" />
            <Field k="meetingRoom" label="Room" />
          </div>
        </Section>

        <Section
          id="invite"
          title="Invite people"
          body="People make an account, then enter a code to join. You can also change anyone's account type in Members."
        >
          <InviteCode />
        </Section>

        <Section
          id="features"
          title="Features"
          body={`Turn off anything your club doesn't need. It disappears for everyone, and nothing is deleted. ${onCount} of ${FEATURES.length} on.`}
        >
          <ul className="-my-2 divide-y divide-line">
            {FEATURES.map(({ key, label, body, icon: Icon }) => (
              <li key={key} className="flex items-center gap-4 py-3.5">
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-line transition-colors",
                    features[key] ? "bg-surface-2 text-fg" : "text-faint",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", !features[key] && "text-muted")}>{label}</p>
                  <p className="text-xs text-muted">{body}</p>
                </div>
                <Switch label={label} checked={features[key]} onChange={(v) => setFeature(key, v)} />
              </li>
            ))}
          </ul>
        </Section>

        {features.wired && (
        <Section title="AM Wired" body="Where approved announcements go, and how drafts are worded.">
          <Field k="wiredEmail" label="AM Wired email" type="email" />
          <label className="block">
            <Label hint="New slots use this length">How often</Label>
            <Select value={String(wiredDays)} onChange={(e) => update({ wiredDays: Number(e.target.value) })}>
              {DAY_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                  {o.v > 1 ? ` (${o.v} days per message)` : " (weekends skipped)"}
                </option>
              ))}
              {!DAY_OPTIONS.some((o) => o.v === wiredDays) && <option value={wiredDays}>Every {wiredDays} days</option>}
            </Select>
          </label>
          <p className="text-xs text-muted">
            Approvals go to {advisorName === "your advisor" ? "your advisor — make them Advisor in Members" : advisorName}.
          </p>
          <label className="block">
            <Label hint="{club} {day} {date} {time} {room} {details}">Draft template</Label>
            <Textarea rows={4} value={template} onChange={(e) => update({ wiredTemplate: e.target.value })} />
          </label>
          <button onClick={() => update({ wiredTemplate: DEFAULT_TEMPLATE })} className="text-xs font-medium text-muted hover:text-fg">
            Reset template
          </button>
        </Section>
        )}

        {features.attendance && (
        <Section title="Attendance" body="Attendance lives on the school’s site. ClubOS just links to it.">
          <Field k="attendanceUrl" label="Attendance website" type="url" hint="Placeholder — change to the real site" />
        </Section>
        )}

        {demo && (
          <Section title="Demo" body="This club is sample data in the built-in database. Resetting puts it back how it started.">
            <Button variant="danger" onClick={reset}>
              <RotateCcw className="size-4" /> Reset sample data
            </Button>
          </Section>
        )}
      </div>
    </Page>
  );
}
