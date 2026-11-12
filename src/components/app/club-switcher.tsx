"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useClub } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { ClubPicker } from "./onboarding";
import { roleLabel } from "./identity";

/** The club name in the sidebar doubles as a switcher between clubs. */
export function ClubSwitcher() {
  const clubs = useClub((s) => s.clubs);
  const clubId = useClub((s) => s.clubId);
  const clubName = useClub((s) => s.settings.clubName);
  const switchClub = useClub((s) => s.switchClub);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="-mx-2 flex w-[calc(100%+16px)] items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-faint">Your club</span>
          <span className="block truncate text-[17px] font-medium tracking-tight">{clubName}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-faint" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 rounded-2xl border border-line bg-surface p-1.5 shadow-card">
          {clubs.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setOpen(false);
                if (c.id !== clubId) void switchClub(c.id);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block text-xs text-muted">{roleLabel(c.role)}</span>
              </span>
              <Check className={cn("size-4 text-accent-text", c.id !== clubId && "invisible")} />
            </button>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              setAdding(true);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-line px-3 py-2.5 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg"
          >
            <Plus className="size-4" /> Join or start another club
          </button>
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a club">
        <ClubPicker compact onDone={() => setAdding(false)} />
      </Modal>
    </div>
  );
}
