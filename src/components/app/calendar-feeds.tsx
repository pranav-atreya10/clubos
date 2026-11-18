"use client";

import { useState } from "react";
import { AlertTriangle, CalendarSync, RefreshCw, Trash2 } from "lucide-react";
import { useClub } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

const ago = (iso: string | null) => {
  if (!iso) return "not yet";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`;
};

/** Officers paste a Schoology (or Google/Outlook/iCloud) calendar link; its events show on the club calendar. */
export function CalendarFeeds() {
  const feeds = useClub((s) => s.feeds) ?? [];
  const addFeed = useClub((s) => s.addFeed);
  const syncFeed = useClub((s) => s.syncFeed);
  const updateFeed = useClub((s) => s.updateFeed);
  const removeFeed = useClub((s) => s.removeFeed);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("Schoology");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {feeds.map((f) => (
        <div key={f.id} className="rounded-2xl border border-line p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">
              <CalendarSync className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{f.label}</p>
              <p className="text-xs text-muted">
                {f.host} · {f.count} events · updated {ago(f.lastSyncedAt)}
              </p>
              {f.lastError && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-danger">
                  <AlertTriangle className="size-3.5" /> {f.lastError}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Update ${f.label} now`}
              disabled={syncing === f.id}
              onClick={async () => {
                setSyncing(f.id);
                await syncFeed(f.id);
                setSyncing(null);
              }}
            >
              <RefreshCw className={syncing === f.id ? "size-4 animate-spin" : "size-4"} />
            </Button>
            <Button size="sm" variant="ghost" aria-label={`Remove ${f.label}`} onClick={() => confirm(`Remove ${f.label}? Its events leave the club calendar.`) && removeFeed(f.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <Label>Name on the calendar</Label>
              <Input defaultValue={f.label} onBlur={(e) => e.target.value.trim() !== f.label && updateFeed(f.id, e.target.value, f.filter)} />
            </label>
            <label className="block">
              <Label hint="optional">Only events containing</Label>
              <Input defaultValue={f.filter} placeholder="e.g. Robotics" onBlur={(e) => e.target.value.trim() !== f.filter && updateFeed(f.id, f.label, e.target.value)} />
            </label>
          </div>
        </div>
      ))}

      {feeds.length < 5 && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const err = await addFeed(url, label, filter);
            setBusy(false);
            if (err) setError(err);
            else {
              setUrl("");
              setFilter("");
            }
          }}
        >
          <label className="block">
            <Label hint="webcal:// or https://">Calendar link</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="webcal://livingston.schoology.com/calendar/feed/ical/…/ical.ics" className="font-mono text-xs" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <Label>Name on the calendar</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <label className="block">
              <Label hint="optional">Only events containing</Label>
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. Robotics" />
            </label>
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <Button type="submit" variant="primary" disabled={!url.trim() || busy}>
            {busy ? "Connecting…" : "Connect calendar"}
          </Button>
        </form>
      )}

      <div className="rounded-xl bg-bg-subtle px-3 py-2.5 text-xs text-muted">
        <p className="font-medium text-fg">Where to find the link in Schoology</p>
        <p className="mt-1">
          Open the calendar in Schoology and look for the <b>iCal</b> / export link. It starts with webcal://. Copy it and paste it here.
        </p>
        <p className="mt-2">
          <b>Everyone in the club will see these events.</b> Use the club group’s calendar, not your personal one, or it will also show your
          classes. The “Only events containing” box can filter a busy calendar.
        </p>
      </div>
    </div>
  );
}
