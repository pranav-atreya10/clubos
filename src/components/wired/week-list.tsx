"use client";

import type { WiredWeek } from "@/lib/types";
import { statusMeta, weekRange } from "@/lib/wired";
import { todayISO } from "@/lib/wired";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

export function WeekList({
  weeks,
  selected,
  onSelect,
}: {
  weeks: WiredWeek[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const today = todayISO();
  return (
    <ol className="space-y-1.5">
      {weeks.map((w) => {
        const meta = statusMeta[w.status];
        const active = w.id === selected;
        const past = (w.endDate ?? w.weekOf) < today;
        const now = w.weekOf <= today && (w.endDate ?? w.weekOf) >= today;
        return (
          <li key={w.id}>
            <button
              onClick={() => onSelect(w.id)}
              aria-current={active}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                active ? "border-fg bg-surface" : "border-transparent hover:bg-surface-2",
                past && !active && "opacity-60",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {weekRange(w)}
                  {now && (
                    <span className="rounded-full bg-fg px-1.5 py-px text-[10px] font-semibold tracking-wide text-bg uppercase">Now</span>
                  )}
                </p>
                <p className={cn("mt-0.5 truncate text-xs", w.message ? "text-muted" : "text-faint italic")}>
                  {w.status === "skipped" ? "No announcement" : w.message || "Empty — tap to write or auto-fill"}
                </p>
              </div>
              <Badge tone={meta.tone} dot>
                {meta.label.split(" — ")[0]}
              </Badge>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
