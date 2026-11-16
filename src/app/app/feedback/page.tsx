"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { listFeedback, markFeedback } from "@/server/feedback";
import { Page, PageHeader, Card, Empty } from "@/components/ui/page";
import { cn } from "@/lib/cn";

type Items = Extract<Awaited<ReturnType<typeof listFeedback>>, { ok: true }>["items"];

/** Only the app owner (OWNER_EMAILS) can see this. */
export default function FeedbackInbox() {
  const [items, setItems] = useState<Items | null | "denied">(null);
  useEffect(() => {
    void listFeedback().then((r) => setItems(r.ok ? r.items : "denied"));
  }, []);
  if (items === "denied") return <Page><PageHeader title="Not found" /></Page>;
  const open = items ? items.filter((i) => !i.done).length : 0;
  return (
    <Page className="max-w-3xl">
      <PageHeader title="Feedback inbox" subtitle={items ? `${open} new · ${items.length} total` : "Loading…"} />
      {items && items.length === 0 && <Empty title="No feedback yet" body="When people tap “Send feedback”, it shows up here." />}
      <div className="space-y-3">
        {items?.map((f) => (
          <Card key={f.id} className={cn("p-5", f.done && "opacity-60")}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                <span className="font-semibold text-fg">{f.name}</span>
                {f.email && ` · ${f.email}`}
                {f.club && ` · ${f.club}`}
                {f.page && ` · ${f.page}`}
              </span>
              <span>{new Date(f.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </div>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{f.message}</p>
            <button
              onClick={async () => {
                await markFeedback(f.id, !f.done);
                setItems((cur) => (Array.isArray(cur) ? cur.map((x) => (x.id === f.id ? { ...x, done: !x.done } : x)) : cur));
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent-text"
            >
              <Check className="size-3.5" /> {f.done ? "Mark as new" : "Mark done"}
            </button>
          </Card>
        ))}
      </div>
    </Page>
  );
}
