import { cn } from "@/lib/cn";

export const initials = (name: string) =>
  name
    .replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function Avatar({ name, className, accent, src }: { name: string; className?: string; accent?: boolean; src?: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("inline-block size-8 shrink-0 rounded-full object-cover ring-1 ring-line", className)} />;
  }
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
