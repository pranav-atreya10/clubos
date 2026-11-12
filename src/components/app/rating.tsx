"use client";

import { cn } from "@/lib/cn";

export function RatingBar({
  value,
  onChange,
  readOnly,
  size = "md",
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex items-center gap-3">
      <div role={readOnly ? "img" : "radiogroup"} aria-label={`Rating ${value ?? "not set"} out of 10`} className="flex gap-[3px]">
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1;
          const on = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              role={readOnly ? undefined : "radio"}
              aria-checked={readOnly ? undefined : value === n}
              aria-label={`${n} out of 10`}
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(value === n ? null : n);
              }}
              className={cn(
                "rounded-[3px] transition-all",
                size === "sm" ? "h-3.5 w-1.5" : "h-6 w-3 hover:scale-y-110",
                on ? (value! >= 8 ? "bg-accent-text" : "bg-fg") : "bg-line",
                readOnly && "cursor-default",
              )}
            />
          );
        })}
      </div>
      <span className={cn("tabular-nums", size === "sm" ? "w-9 text-xs text-muted" : "text-sm font-semibold")}>
        {value === null ? "—" : `${value}/10`}
      </span>
    </div>
  );
}
