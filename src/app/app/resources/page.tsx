"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, FileText, Link2, Plus, Presentation, Search, Sheet, Trash2 } from "lucide-react";
import { useClub } from "@/lib/store";
import type { ResourceKind } from "@/lib/types";
import { fmtShort } from "@/lib/dates";
import { Page, PageHeader, Chips, Empty } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

const kindIcon: Record<ResourceKind, typeof FileText> = { doc: FileText, slides: Presentation, sheet: Sheet, link: Link2 };
const kindLabel: Record<ResourceKind, string> = { doc: "Doc", slides: "Slides", sheet: "Sheet", link: "Link" };

export default function ResourcesPage() {
  const s = useClub();
  const isAdmin = s.role === "admin";
  const cats = useMemo(() => Array.from(new Set(s.resources.map((r) => r.category))), [s.resources]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", url: "", kind: "doc" as ResourceKind, category: "Club info" });

  const visible = s.resources.filter(
    (r) =>
      (cat === "all" || r.category === cat) &&
      (!q || r.title.toLowerCase().includes(q.toLowerCase())) &&
      (s.role !== "member" || r.category !== "Officers"),
  );

  return (
    <Page>
      <PageHeader
        title="Resources"
        subtitle="Docs, slides, and links — one place instead of ten group chats."
        actions={
          isAdmin && (
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Add
            </Button>
          )
        }
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Chips
          value={cat}
          onChange={setCat}
          options={[
            { value: "all", label: "All" },
            ...cats.filter((c) => s.role !== "member" || c !== "Officers").map((c) => ({ value: c, label: c })),
          ]}
        />
        <div data-reveal className="relative sm:w-60">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input aria-label="Search resources" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources…" className="rounded-full pl-9" />
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty title="No resources found" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => {
            const Icon = kindIcon[r.kind];
            return (
              <div data-reveal key={r.id} className="group">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative flex aspect-[16/10] items-center justify-center rounded-2xl border border-line bg-surface transition-[transform,border-color] duration-300 group-hover:-translate-y-0.5 group-hover:border-line-strong"
                >
                  <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface-2">
                    <Icon className="size-6 text-muted" strokeWidth={1.6} />
                  </span>
                  <ArrowUpRight className="absolute top-4 right-4 size-4 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="absolute bottom-4 left-4 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">{r.category}</span>
                </a>
                <div className="flex items-start justify-between gap-2 px-1 pt-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="text-xs text-muted">
                      {kindLabel[r.kind]} · {r.addedBy} · {fmtShort(r.date)}
                    </p>
                  </div>
                  {isAdmin && (
                    <button aria-label={`Delete ${r.title}`} onClick={() => s.removeResource(r.id)} className="rounded-full p-1.5 text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add resource">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.title.trim() || !f.url.trim()) return;
            s.addResource({ ...f, title: f.title.trim(), url: f.url.trim() });
            setF({ ...f, title: "", url: "" });
            setOpen(false);
          }}
        >
          <label className="block">
            <Label>Title</Label>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Meeting notes — Nov 12" />
          </label>
          <label className="block">
            <Label>Link</Label>
            <Input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://docs.google.com/…" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <Label>Type</Label>
              <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as ResourceKind })}>
                {(Object.keys(kindLabel) as ResourceKind[]).map((k) => (
                  <option key={k} value={k}>{kindLabel[k]}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <Label hint="“Officers” is hidden from members">Folder</Label>
              <Input list="cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
              <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={!f.title.trim() || !f.url.trim()}>
            Add resource
          </Button>
        </form>
      </Modal>
    </Page>
  );
}
