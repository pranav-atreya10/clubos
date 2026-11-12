import { cn } from "@/lib/cn";
import { Reveal } from "./reveal";

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Reveal className={cn("mx-auto w-full max-w-6xl px-4 pt-6 pb-24 sm:px-8 lg:px-12 lg:pt-10", className)}>{children}</Reveal>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header data-reveal className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[44px] leading-none tracking-tight sm:text-[52px]">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-reveal className={cn("mb-4 flex items-center justify-between gap-4", className)}>
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function Card({
  children,
  className,
  ...p
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-reveal className={cn("rounded-2xl border border-line bg-surface", className)} {...p}>
      {children}
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <p className="font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div data-reveal className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
            value === o.value
              ? "border-fg bg-fg text-bg"
              : "border-line text-muted hover:border-line-strong hover:text-fg",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn("text-xs tabular-nums", value === o.value ? "opacity-60" : "text-faint")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
