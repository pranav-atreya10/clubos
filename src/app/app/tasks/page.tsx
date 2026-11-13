"use client";

import { useState } from "react";
import { Check, Eye, History as HistoryIcon, Plus, Trash2 } from "lucide-react";
import { useClub } from "@/lib/store";
import type { Task, TaskStatus } from "@/lib/types";
import { daysFromToday, fmtLong, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Page, PageHeader, Chips, Empty } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { History } from "@/components/wired/history";

const COLS: { s: TaskStatus; label: string }[] = [
  { s: "todo", label: "To do" },
  { s: "doing", label: "In progress" },
  { s: "done", label: "Done" },
];
const nextStatus: Record<TaskStatus, TaskStatus> = { todo: "doing", doing: "done", done: "todo" };

function TaskCard({ t, canMove, canDelete, onOpen }: { t: Task; canMove: boolean; canDelete: boolean; onOpen: () => void }) {
  const s = useClub();
  const person = s.members.find((m) => m.id === t.assigneeId);
  const who = person?.name ?? "Unassigned";
  const overdue = t.status !== "done" && t.due < daysFromToday(0);
  return (
    <div data-reveal className="group rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3">
        <button
          aria-label={t.status === "done" ? "Mark not done" : "Move forward"}
          disabled={!canMove}
          onClick={() => s.setTaskStatus(t.id, nextStatus[t.status])}
          className={cn(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-default",
            t.status === "done" ? "border-transparent bg-accent text-accent-fg" : t.status === "doing" ? "border-accent-text" : "border-line-strong enabled:hover:border-fg",
          )}
        >
          {t.status === "done" && <Check className="size-3" strokeWidth={3} />}
          {t.status === "doing" && <span className="size-2 rounded-full bg-accent-text" />}
        </button>
        <button onClick={onOpen} className={cn("flex-1 text-left text-sm font-medium hover:underline underline-offset-4", t.status === "done" && "text-muted line-through")}>
          {t.title}
        </button>
        {canDelete && (
          <button aria-label="Delete task" onClick={() => s.removeTask(t.id)} className="text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100">
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between pl-8">
        <span className="flex items-center gap-2 text-xs text-muted">
          <Avatar name={who} src={person?.avatar} className="size-5 text-[9px]" />
          {who}
        </span>
        <div className="flex items-center gap-2">
          {t.history.length > 1 && (
            <button onClick={onOpen} aria-label={`History for ${t.title}`} className="text-faint hover:text-fg">
              <HistoryIcon className="size-3.5" />
            </button>
          )}
          <Badge tone={overdue ? "danger" : "muted"}>{overdue ? "Overdue" : relativeDay(t.due)}</Badge>
        </div>
      </div>
    </div>
  );
}

function TaskDetails({ t, onClose }: { t: Task; onClose: () => void }) {
  const members = useClub((s) => s.members);
  const live = useClub((s) => s.tasks.find((x) => x.id === t.id)) ?? t;
  const who = members.find((m) => m.id === live.assigneeId)?.name ?? "Unassigned";
  const status = COLS.find((c) => c.s === live.status)!.label;
  return (
    <Modal open onClose={onClose} title={live.title}>
      <dl className="mb-6 grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-xs text-muted">Assigned to</dt>
          <dd className="mt-1 font-medium">{who}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Due</dt>
          <dd className="mt-1 font-medium">{fmtLong(live.due)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Status</dt>
          <dd className="mt-1 font-medium">{status}</dd>
        </div>
      </dl>
      <div className="max-h-72 overflow-y-auto border-t border-line pt-5">
        <History title="Version history" items={live.history} empty="No changes recorded yet." />
      </div>
    </Modal>
  );
}

export default function TasksPage() {
  const s = useClub();
  const role = s.role;
  const isAdmin = role === "admin";
  const me = s.members.find((m) => m.id === s.meId);
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(s.members.find((m) => m.role !== "advisor")?.id ?? "");
  const [due, setDue] = useState(daysFromToday(7));

  // Members only ever see their own tasks. Officers can switch; the advisor sees everything.
  const onlyMine = role === "member" || (isAdmin && scope === "mine");
  const tasks = s.tasks.filter((t) => !onlyMine || t.assigneeId === me?.id);
  const canMove = (t: Task) => isAdmin || (role === "member" && t.assigneeId === me?.id);
  const detail = s.tasks.find((t) => t.id === openId);

  const subtitle =
    role === "member"
      ? "Everything assigned to you. Tap the circle to move a task along."
      : role === "advisor"
        ? "What officers and members are working on. Tap a task to see its history."
        : "Who's doing what, and by when. Tap the circle to move a task along.";

  return (
    <Page>
      <PageHeader
        title={role === "member" ? "Your tasks" : "Tasks"}
        subtitle={subtitle}
        actions={
          isAdmin && (
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> New task
            </Button>
          )
        }
      />

      {isAdmin && (
        <div className="mb-6">
          <Chips
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: "Everyone", count: s.tasks.length },
              { value: "mine", label: "Mine", count: s.tasks.filter((t) => t.assigneeId === me?.id).length },
            ]}
          />
        </div>
      )}
      {role === "advisor" && (
        <p data-reveal className="mb-6 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-muted">
          <Eye className="size-3.5" /> View only
        </p>
      )}

      {role === "member" && tasks.length === 0 ? (
        <Empty title="Nothing assigned to you" body="When an officer gives you a task, it’ll show up here." />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {COLS.map((c) => {
            const list = tasks.filter((t) => t.status === c.s).sort((a, b) => a.due.localeCompare(b.due));
            return (
              <section key={c.s} className="rounded-3xl bg-bg-subtle p-3">
                <h2 data-reveal className="flex items-center justify-between px-2 pt-1 pb-3 text-sm font-semibold">
                  {c.label} <span className="text-xs font-normal text-faint tabular-nums">{list.length}</span>
                </h2>
                <div className="space-y-2">
                  {list.map((t) => (
                    <TaskCard key={t.id} t={t} canMove={canMove(t)} canDelete={isAdmin} onOpen={() => setOpenId(t.id)} />
                  ))}
                  {list.length === 0 && <p className="px-2 pb-2 text-sm text-faint">Nothing here.</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {detail && <TaskDetails t={detail} onClose={() => setOpenId(null)} />}

      <Modal open={open} onClose={() => setOpen(false)} title="New task">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            s.addTask({ title: title.trim(), assigneeId, due });
            setTitle("");
            setOpen(false);
          }}
        >
          <label className="block">
            <Label>Task</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book the bus" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <Label>Who</Label>
              <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                {s.members.filter((m) => m.role !== "advisor").map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <Label>Due</Label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={!title.trim()}>
            Assign task
          </Button>
        </form>
      </Modal>
    </Page>
  );
}
