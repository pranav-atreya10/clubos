"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useClub } from "@/lib/store";
import type { Task, TaskStatus } from "@/lib/types";
import { daysFromToday, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Page, PageHeader, Chips } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

const COLS: { s: TaskStatus; label: string }[] = [
  { s: "todo", label: "To do" },
  { s: "doing", label: "In progress" },
  { s: "done", label: "Done" },
];
const nextStatus: Record<TaskStatus, TaskStatus> = { todo: "doing", doing: "done", done: "todo" };

function TaskCard({ t, canEdit }: { t: Task; canEdit: boolean }) {
  const s = useClub();
  const who = s.members.find((m) => m.id === t.assigneeId)?.name ?? "Unassigned";
  const today = daysFromToday(0);
  const overdue = t.status !== "done" && t.due < today;
  return (
    <div data-reveal className="group rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <button
          aria-label={t.status === "done" ? "Mark not done" : "Move forward"}
          onClick={() => s.setTaskStatus(t.id, nextStatus[t.status])}
          className={cn(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            t.status === "done" ? "border-transparent bg-accent text-accent-fg" : t.status === "doing" ? "border-accent-text" : "border-line-strong hover:border-fg",
          )}
        >
          {t.status === "done" && <Check className="size-3" strokeWidth={3} />}
          {t.status === "doing" && <span className="size-2 rounded-full bg-accent-text" />}
        </button>
        <p className={cn("flex-1 text-sm font-medium", t.status === "done" && "text-muted line-through")}>{t.title}</p>
        {canEdit && (
          <button aria-label="Delete task" onClick={() => s.removeTask(t.id)} className="text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100">
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between pl-8">
        <span className="flex items-center gap-2 text-xs text-muted">
          <Avatar name={who} className="size-5 text-[9px]" />
          {who}
        </span>
        <Badge tone={overdue ? "danger" : "muted"}>{overdue ? "Overdue" : relativeDay(t.due)}</Badge>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const s = useClub();
  const isAdmin = s.role === "admin";
  const me = s.members.find((m) => m.name === s.userName);
  const [scope, setScope] = useState<"all" | "mine">(isAdmin ? "all" : "mine");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(s.members[0]?.id ?? "");
  const [due, setDue] = useState(daysFromToday(7));

  const tasks = s.tasks.filter((t) => scope === "all" || t.assigneeId === me?.id);

  return (
    <Page>
      <PageHeader
        title="Tasks"
        subtitle="Who's doing what, and by when. Tap the circle to move a task along."
        actions={
          isAdmin && (
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> New task
            </Button>
          )
        }
      />
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
                  <TaskCard key={t.id} t={t} canEdit={isAdmin} />
                ))}
                {list.length === 0 && <p className="px-2 pb-2 text-sm text-faint">Nothing here.</p>}
              </div>
            </section>
          );
        })}
      </div>

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
                {s.members.map((m) => (
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
