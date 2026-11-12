import { cn } from "@/lib/cn";

export type Tone = "neutral" | "accent" | "warn" | "danger" | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg",
  accent: "bg-accent-soft text-accent-text",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  muted: "bg-transparent text-muted border border-line",
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
