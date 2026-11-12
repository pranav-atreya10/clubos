"use client";

import { RotateCcw } from "lucide-react";
import { useClub } from "@/lib/store";
import { DEFAULT_TEMPLATE } from "@/lib/seed";
import type { ClubSettings } from "@/lib/types";
import { Page, PageHeader, Card } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { clerkEnabled } from "@/lib/clerk";

function Field({ k, label, hint, type = "text" }: { k: keyof ClubSettings; label: string; hint?: string; type?: string }) {
  const value = useClub((s) => s.settings[k]);
  const update = useClub((s) => s.updateSettings);
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <Input type={type} value={value} onChange={(e) => update({ [k]: e.target.value })} />
    </label>
  );
}

function Section({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <Card className="grid gap-6 p-6 sm:p-8 md:grid-cols-[220px_1fr]">
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
  const update = useClub((s) => s.updateSettings);
  const reset = useClub((s) => s.resetDemo);

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

        <Section title="AM Wired" body="Where approved announcements go, and how drafts are worded.">
          <Field k="wiredEmail" label="AM Wired email" type="email" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field k="advisorName" label="Advisor" />
            <Field k="advisorEmail" label="Advisor email" type="email" />
          </div>
          <label className="block">
            <Label hint="{club} {day} {date} {time} {room} {details}">Draft template</Label>
            <Textarea rows={4} value={template} onChange={(e) => update({ wiredTemplate: e.target.value })} />
          </label>
          <button onClick={() => update({ wiredTemplate: DEFAULT_TEMPLATE })} className="text-xs font-medium text-muted hover:text-fg">
            Reset template
          </button>
        </Section>

        <Section title="Attendance" body="Attendance lives on the school’s site. ClubOS just links to it.">
          <Field k="attendanceUrl" label="Attendance website" type="url" />
        </Section>

        {!clerkEnabled && (
          <Section title="Demo" body="This is a demo with sample data saved in your browser.">
            <Button variant="danger" onClick={reset}>
              <RotateCcw className="size-4" /> Reset sample data
            </Button>
          </Section>
        )}
      </div>
    </Page>
  );
}
