import type { WiredWeek } from "@/lib/types";

export function History({ items }: { items: WiredWeek["history"] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">Activity</p>
      <ol className="relative space-y-3 border-l border-line pl-5">
        {[...items].reverse().map((h, i) => (
          <li key={i} className="relative text-sm">
            <span className="absolute top-1.5 -left-[24.5px] size-2 rounded-full bg-line-strong ring-4 ring-surface" />
            <span className="font-medium">{h.by}</span> <span className="text-muted">— {h.action.charAt(0).toLowerCase() + h.action.slice(1)}</span>
            <span className="ml-2 text-xs text-faint">
              {new Date(h.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
