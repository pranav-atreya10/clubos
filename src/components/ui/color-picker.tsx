"use client";

import { Check } from "lucide-react";
import { COLORS, COLOR_KEYS } from "@/lib/colors";
import { cn } from "@/lib/cn";

export function ColorPicker({ value, onChange }: { value: string | null | undefined; onChange: (c: string | null) => void }) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        aria-label="No color"
        onClick={() => onChange(null)}
        className={cn("inline-flex size-7 items-center justify-center rounded-full border border-dashed border-line-strong text-faint", !value && "ring-2 ring-fg ring-offset-2 ring-offset-surface")}
      >
        {!value && <Check className="size-3.5" />}
      </button>
      {COLOR_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          aria-label={COLORS[k].label}
          title={COLORS[k].label}
          onClick={() => onChange(k)}
          style={{ background: COLORS[k].hex }}
          className={cn("inline-flex size-7 items-center justify-center rounded-full text-white", value === k && "ring-2 ring-fg ring-offset-2 ring-offset-surface")}
        >
          {value === k && <Check className="size-3.5" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
