"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EyeOff, Plus, Search, Star, Trash2 } from "lucide-react";
import { useClub } from "@/lib/store";
import type { Member, Role } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Page, PageHeader, Card, Chips, Empty } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { RatingBar } from "@/components/app/rating";
import { History } from "@/components/wired/history";

type Filter = "all" | "officers" | "candidates" | "unrated";
type Sort = "rating" | "name" | "grade";

function MemberModal({
  m,
  onClose,
  canEdit,
  canRate,
  ratings,
}: {
  m: Member;
  onClose: () => void;
  canEdit: boolean;
  canRate: boolean;
  ratings: boolean;
}) {
  const s = useClub();
  const live = s.members.find((x) => x.id === m.id) ?? m;
  const noteBefore = useRef(live.ratingNote);
  const logNote = s.logRatingNote;
  // If the window closes while the note is being typed, still record the change.
  useEffect(() => () => logNote(m.id, noteBefore.current), [logNote, m.id]);
  return (
    <Modal open onClose={onClose} title={live.name}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2 text-sm text-muted">
          <span>Grade {live.grade}</span>·<span>{live.email}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label hint={canEdit ? "What they can do" : undefined}>Account type</Label>
            <Select disabled={!canEdit} value={live.role} onChange={(e) => s.setMemberRole(live.id, e.target.value as Role)}>
              <option value="member">Member</option>
              <option value="admin">Officer</option>
              <option value="advisor">Advisor</option>
            </Select>
          </label>
          <label className="block">
            <Label hint="e.g. President">Title</Label>
            <Input disabled={!canEdit} value={live.title} onChange={(e) => s.updateMember(live.id, { title: e.target.value })} />
          </label>
        </div>
        {!live.hasAccount && (
          <p className="rounded-xl bg-bg-subtle px-3 py-2 text-xs text-muted">
            {live.name.split(" ")[0]} hasn’t signed in yet. When they join with the invite code using {live.email || "the same email"}, this profile becomes theirs.
          </p>
        )}
        {ratings && live.role !== "advisor" && (
        <>
        <div>
          <Label hint="Leaders only">Leadership rating</Label>
          <RatingBar value={live.rating} readOnly={!canRate} onChange={(v) => s.setRating(live.id, v)} />
        </div>
        <label className="block">
          <Label hint="Leaders only">Private note</Label>
          <Textarea
            disabled={!canRate}
            rows={3}
            value={live.ratingNote}
            onFocus={() => (noteBefore.current = live.ratingNote)}
            onBlur={() => {
              s.logRatingNote(live.id, noteBefore.current);
              noteBefore.current = live.ratingNote;
            }}
            onChange={(e) => s.setRatingNote(live.id, e.target.value)}
            placeholder="Why this rating? e.g. “Led the pit-stop drill without being asked.”"
          />
        </label>
        </>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
          {ratings && live.role !== "advisor" ? (
          <Button
            variant={live.boardCandidate ? "accent" : "secondary"}
            disabled={!canRate}
            onClick={() => s.toggleCandidate(live.id)}
          >
            <Star className={cn("size-4", live.boardCandidate && "fill-current")} />
            {live.boardCandidate ? "Board candidate" : "Mark as board candidate"}
          </Button>
          ) : (
            <span />
          )}
          {canEdit && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                s.removeMember(live.id);
                onClose();
              }}
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          )}
        </div>
        {ratings && live.role !== "advisor" && (
          <div className="max-h-64 overflow-y-auto border-t border-line pt-5">
            <History title="Rating history" items={live.ratingHistory} empty="Not rated yet." />
          </div>
        )}
      </div>
    </Modal>
  );
}

function AddMember({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addMember = useClub((s) => s.addMember);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState<Member["grade"]>(9);
  return (
    <Modal open={open} onClose={onClose} title="Add member">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addMember({ name: name.trim(), email: email.trim(), grade });
          setName("");
          setEmail("");
          onClose();
        }}
      >
        <label className="block">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="First Last" />
        </label>
        <label className="block">
          <Label>School email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@school.edu" />
        </label>
        <label className="block">
          <Label>Grade</Label>
          <Select value={grade} onChange={(e) => setGrade(Number(e.target.value) as Member["grade"])}>
            {[9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>
                {g}th
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="primary" className="w-full" disabled={!name.trim()}>
          Add member
        </Button>
      </form>
    </Modal>
  );
}

export default function MembersPage() {
  const members = useClub((s) => s.members);
  const role = useClub((s) => s.role);
  const setRating = useClub((s) => s.setRating);
  const toggleCandidate = useClub((s) => s.toggleCandidate);
  const ratings = useClub((s) => s.settings.features.ratings);
  const canEdit = role === "admin"; // roles, adding and removing members
  const canRate = role === "admin" || role === "advisor"; // ratings, notes, board candidates
  const [pickedFilter, setFilter] = useState<Filter>("all");
  const [pickedSort, setSort] = useState<Sort>("rating");
  // With ratings turned off, rating-based filters and sorting fall back to plain ones.
  const filter: Filter = !ratings && (pickedFilter === "candidates" || pickedFilter === "unrated") ? "all" : pickedFilter;
  const sort: Sort = !ratings && pickedSort === "rating" ? "name" : pickedSort;
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => {
    const f = members.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "officers") return m.isOfficer;
      if (filter === "candidates") return m.boardCandidate;
      if (filter === "unrated") return m.rating === null && m.role !== "advisor";
      return true;
    });
    return f.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "grade"
          ? b.grade - a.grade
          : (b.rating ?? -1) - (a.rating ?? -1),
    );
  }, [members, filter, sort, q]);

  const open = members.find((m) => m.id === openId);
  const rated = members.filter((m) => m.rating !== null && m.role !== "advisor");
  const avg = rated.length ? rated.reduce((n, m) => n + m.rating!, 0) / rated.length : 0;

  return (
    <Page>
      <PageHeader
        title="Members"
        subtitle={ratings ? `${members.length} members · average rating ${avg.toFixed(1)}/10` : `${members.length} members · ${members.filter((m) => m.isOfficer).length} officers`}
        actions={
          canEdit && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Add member
            </Button>
          )
        }
      />

      {ratings && (
      <div data-reveal className="mb-6 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent-text">
        <EyeOff className="size-4 shrink-0" />
        Ratings and notes are private. Only officers and the advisor can see them — members never do.
      </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Everyone", count: members.length },
            ...(ratings ? [{ value: "candidates" as const, label: "Board candidates", count: members.filter((m) => m.boardCandidate).length }] : []),
            { value: "officers", label: "Officers", count: members.filter((m) => m.isOfficer).length },
            ...(ratings ? [{ value: "unrated" as const, label: "Not rated", count: members.filter((m) => m.rating === null).length }] : []),
          ]}
        />
        <div data-reveal className="flex gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <Input aria-label="Search members" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="rounded-full pl-9" />
          </div>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto rounded-full">
            {ratings && <option value="rating">Top rated</option>}
            <option value="name">Name</option>
            <option value="grade">Grade</option>
          </Select>
        </div>
      </div>

      {list.length === 0 ? (
        <Empty title="No one here yet" body="Try a different filter." />
      ) : (
        <Card className="overflow-hidden">
          <div className={cn("hidden gap-4 border-b border-line px-5 py-3 text-xs font-medium text-muted md:grid", ratings ? "grid-cols-[1fr_120px_200px_48px]" : "grid-cols-[1fr_160px]")}>
            <span>Member</span>
            <span>Role</span>
            {ratings && <span>Rating</span>}
            {ratings && <span className="sr-only">Board candidate</span>}
          </div>
          <ul className="divide-y divide-line">
            {list.map((m, i) => (
              <li key={m.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenId(m.id)}
                  onKeyDown={(e) => e.key === "Enter" && setOpenId(m.id)}
                  className={cn(
                    "grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-2",
                    ratings ? "md:grid-cols-[1fr_120px_200px_48px]" : "md:grid-cols-[1fr_160px]",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {ratings && sort === "rating" && filter === "all" && !q && (
                      <span className="w-5 text-right text-xs text-faint tabular-nums">{i + 1}</span>
                    )}
                    <Avatar name={m.name} accent={ratings && m.boardCandidate} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="truncate text-xs text-muted">
                        {m.role === "advisor" ? "Advisor" : `Grade ${m.grade}`}
                        {!m.hasAccount && " · hasn’t joined yet"}
                        {ratings && m.ratingNote && ` · ${m.ratingNote}`}
                      </p>
                    </div>
                  </div>
                  <div className={ratings ? "hidden md:block" : "block"}>
                    {m.role === "advisor" ? (
                      <Badge tone="accent">Advisor</Badge>
                    ) : m.isOfficer ? (
                      <Badge>{m.title}</Badge>
                    ) : (
                      <span className="text-sm text-muted">Member</span>
                    )}
                  </div>
                  {ratings && m.role === "advisor" && (
                    <>
                      <span className="hidden text-xs text-faint md:block">Not rated</span>
                      <span className="hidden md:block" />
                    </>
                  )}
                  {ratings && m.role !== "advisor" && (
                  <>
                  <div className="col-span-2 md:col-span-1" onClick={(e) => e.stopPropagation()}>
                    <RatingBar size="sm" value={m.rating} readOnly={!canRate} onChange={(v) => setRating(m.id, v)} />
                  </div>
                  <button
                    aria-label={m.boardCandidate ? "Remove board candidate" : "Mark board candidate"}
                    aria-pressed={m.boardCandidate}
                    disabled={!canRate}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCandidate(m.id);
                    }}
                    className={cn(
                      "col-start-2 row-start-1 justify-self-end rounded-full p-2 transition-colors md:col-start-auto md:row-start-auto",
                      m.boardCandidate ? "text-accent-text" : "text-faint hover:text-fg",
                    )}
                  >
                    <Star className={cn("size-4", m.boardCandidate && "fill-current")} />
                  </button>
                  </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {open && <MemberModal m={open} canEdit={canEdit} canRate={canRate} ratings={ratings} onClose={() => setOpenId(null)} />}
      <AddMember open={adding} onClose={() => setAdding(false)} />
    </Page>
  );
}
