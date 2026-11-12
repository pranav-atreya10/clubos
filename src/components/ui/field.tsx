import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-fg placeholder:text-faint transition-colors focus:border-line-strong focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-accent/15";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...p }, ref) {
    return <input ref={ref} className={cn(base, "h-10", className)} {...p} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(base, "py-3 leading-relaxed", className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...p }, ref) {
    return <select ref={ref} className={cn(base, "h-10 pr-8", className)} {...p} />;
  },
);

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-fg">
      {children}
      {hint && <span className="text-xs font-normal text-faint">{hint}</span>}
    </span>
  );
}
