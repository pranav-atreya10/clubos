import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" className="fill-fg" />
      <circle cx="16" cy="16" r="7.5" fill="none" strokeWidth="3" className="stroke-bg" />
      <circle cx="21.3" cy="10.7" r="3" className="fill-accent-text" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[19px] font-semibold tracking-tight">ClubOS</span>
    </span>
  );
}
