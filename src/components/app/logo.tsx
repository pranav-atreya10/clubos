import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="" aria-hidden className={cn("size-7 rounded-lg", className)} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[19px] font-semibold tracking-tight">ClubOS</span>
    </span>
  );
}
