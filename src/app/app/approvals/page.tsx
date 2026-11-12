"use client";

import { useState } from "react";
import { Check, CornerUpLeft, PartyPopper } from "lucide-react";
import { useClub } from "@/lib/store";
import type { WiredWeek } from "@/lib/types";
import { statusMeta, weekRange } from "@/lib/wired";
import { Page, PageHeader, SectionTitle, Card, Empty } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";

function ApprovalCard({ w }: { w: WiredWeek }) {
  const approve = useClub((s) => s.wiredApprove);
  const requestChanges = useClub((s) => s.wiredRequestChanges);
  const club = useClub((s) => s.settings.clubName);
  const [text, setText] = useState(w.message);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const edited = text.trim() !== w.message.trim();
  const submitter = [...w.history].reverse().find((h) => h.action.startsWith("Sent to"))?.by ?? "An officer";

  return (
    <Card className="p-6 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Avatar name={submitter} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{submitter}</p>
          <p className="text-xs text-muted">
            {club} · for the week of {weekRange(w.weekOf)}
          </p>
        </div>
        {edited && <Badge tone="warn">You edited this</Badge>}
      </div>

      <Textarea
        aria-label="Announcement text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="text-[17px]"
      />
      <p className="mt-2 text-xs text-faint">Tap the text to fix anything small yourself — no email back-and-forth.</p>

      {noteOpen && (
        <div className="mt-4">
          <Textarea
            aria-label="Note to officers"
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="What should they change?"
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!noteOpen ? (
          <>
            <Button variant="accent" onClick={() => approve(w.id, edited ? text : undefined)}>
              <Check className="size-4" /> {edited ? "Save edits & approve" : "Approve"}
            </Button>
            <Button variant="ghost" onClick={() => setNoteOpen(true)}>
              <CornerUpLeft className="size-4" /> Send back with a note
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" disabled={!note.trim()} onClick={() => requestChanges(w.id, note.trim())}>
              Send back
            </Button>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default function ApprovalsPage() {
  const wired = useClub((s) => s.wired);
  const pending = wired.filter((w) => w.status === "pending").sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  const decided = wired
    .filter((w) => ["approved", "sent", "changes"].includes(w.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <Page className="max-w-3xl">
      <PageHeader title="Approvals" subtitle="AM Wired announcements officers have sent you. Approve, tweak, or send back." />

      <section className="space-y-5">
        {pending.length === 0 ? (
          <Empty icon={<PartyPopper className="size-6" />} title="All caught up" body="New announcements will appear here as soon as officers send them." />
        ) : (
          pending.map((w) => <ApprovalCard key={w.id} w={w} />)
        )}
      </section>

      {decided.length > 0 && (
        <section className="mt-14">
          <SectionTitle>Recently reviewed</SectionTitle>
          <Card className="divide-y divide-line">
            {decided.map((w) => (
              <div key={w.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Week of {weekRange(w.weekOf)}</p>
                  <p className="truncate text-xs text-muted">{w.message}</p>
                </div>
                <Badge tone={statusMeta[w.status].tone} dot>
                  {statusMeta[w.status].label.split(" — ")[0]}
                </Badge>
              </div>
            ))}
          </Card>
        </section>
      )}
    </Page>
  );
}
