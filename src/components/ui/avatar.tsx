import { cn } from "@/lib/cn";

export const initials = (name: string) =>
  name
    .replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function Avatar({ name, className, accent }: { name: string; className?: string; accent?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide",
        accent ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg ring-1 ring-line",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
