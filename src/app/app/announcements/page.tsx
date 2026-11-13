"use client";

import { useState } from "react";
import { Pin, Plus, Radio, Trash2 } from "lucide-react";
import Link from "next/link";
import { useClub } from "@/lib/store";
import { Page, PageHeader, Card } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { AnnouncementDialog } from "@/components/app/quick-add";
import { AnnouncementItem } from "@/components/app/bits";
import { cn } from "@/lib/cn";

export default function AnnouncementsPage() {
  const s = useClub();
  const isAdmin = s.role === "admin";
  const canPost = isAdmin || s.role === "advisor";
  const [open, setOpen] = useState(false);
  const list = [...s.announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date));

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title="Announcements"
        subtitle="Club news for members — no more digging through Schoology."
        actions={
          canPost && (
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Post
            </Button>
          )
        }
      />

      {isAdmin && s.settings.features.wired && (
        <Link
          href="/app/wired"
          data-reveal
          className="mb-6 flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <Radio className="size-4 text-accent-text" />
          Need it read on the morning announcements? Plan it in <span className="font-medium text-fg">AM Wired</span> →
        </Link>
      )}

      <Card className="divide-y divide-line p-6 sm:p-8">
        {list.map((a) => (
          <AnnouncementItem
            key={a.id}
            a={a}
            actions={
              canPost && (
                <div className="flex shrink-0 gap-1 self-start opacity-60 transition-opacity group-hover:opacity-100">
                  <button
                    aria-label={a.pinned ? "Unpin" : "Pin"}
                    onClick={() => s.togglePin(a.id)}
                    className={cn("rounded-full p-1.5 hover:bg-surface-2", a.pinned ? "text-accent-text" : "text-faint hover:text-fg")}
                  >
                    <Pin className="size-4" />
                  </button>
                  <button aria-label="Delete" onClick={() => s.removeAnnouncement(a.id)} className="rounded-full p-1.5 text-faint hover:bg-surface-2 hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )
            }
          />
        ))}
        {list.length === 0 && <p className="text-sm text-muted">No announcements yet.</p>}
      </Card>

      <AnnouncementDialog open={open} onClose={() => setOpen(false)} />
    </Page>
  );
}
