import { cn } from "@/lib/cn";

/** Black knight in light mode, green knight in dark mode. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-light.png" alt="" aria-hidden className={cn("size-7 rounded-lg dark:hidden", className)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-dark.png" alt="" aria-hidden className={cn("hidden size-7 rounded-lg dark:block", className)} />
    </>
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
