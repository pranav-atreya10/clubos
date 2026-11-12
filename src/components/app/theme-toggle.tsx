"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

const opts = [
  { v: "system", icon: Monitor, label: "Match device" },
  { v: "light", icon: Sun, label: "Light" },
  { v: "dark", icon: Moon, label: "Dark" },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex rounded-full border border-line p-0.5", className)}>
      {opts.map(({ v, icon: Icon, label }) => {
        const active = mounted && theme === v;
        return (
          <button
            key={v}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(v)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full transition-colors",
              active ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
