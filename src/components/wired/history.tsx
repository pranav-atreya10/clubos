import type { HistoryEntry } from "@/lib/types";

const when = (iso: string) => {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
};

/** A version history: newest first, who did what, and when. */
export function History({
  items,
  title = "Activity",
  empty,
}: {
  items: Pick<HistoryEntry, "at" | "by" | "action">[];
  title?: string;
  empty?: string;
}) {
  if (!items.length) {
    return empty ? (
      <div>
        <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">{title}</p>
        <p className="text-sm text-muted">{empty}</p>
      </div>
    ) : null;
  }
  return (
    <div>
      <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">{title}</p>
      <ol className="relative space-y-3 border-l border-line pl-5" data-lenis-prevent>
        {[...items].reverse().map((h, i) => (
          <li key={i} className="relative text-sm">
            <span className="absolute top-1.5 -left-[24.5px] size-2 rounded-full bg-line-strong ring-4 ring-surface" />
            <span className="font-medium">{h.by}</span>{" "}
            <span className="text-muted">— {h.action.charAt(0).toLowerCase() + h.action.slice(1)}</span>
            <span className="mt-0.5 block text-xs text-faint">{when(h.at)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
