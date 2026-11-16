"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, MessageSquareHeart } from "lucide-react";
import { useClub } from "@/lib/store";
import { amOwner, sendFeedback } from "@/server/feedback";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

const row = "flex h-10 w-full items-center gap-2.5 rounded-xl px-1.5 text-[14px] text-muted transition-colors hover:bg-surface-2 hover:text-fg";
const tile = "inline-flex size-7 items-center justify-center rounded-lg border border-line bg-surface";

/** "Send feedback" for everyone, plus the owner's inbox link. */
export function FeedbackLinks() {
  const pathname = usePathname();
  const club = useClub((s) => s.settings.clubName);
  const demo = useClub((s) => s.demo);
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | string>("idle");

  useEffect(() => {
    void amOwner().then(setOwner).catch(() => null);
  }, []);
  if (demo) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className={row}>
        <span className={tile}>
          <MessageSquareHeart className="size-3.5" />
        </span>
        Send feedback
      </button>
      {owner && (
        <Link href="/app/feedback" className={row}>
          <span className={tile}>
            <Inbox className="size-3.5" />
          </span>
          Feedback inbox
        </Link>
      )}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          if (state === "sent") {
            setState("idle");
            setText("");
          }
        }}
        title="Send feedback"
      >
        {state === "sent" ? (
          <p className="text-sm text-muted">Thanks! It went straight to the person who makes ClubOS.</p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setState("sending");
              const r = await sendFeedback({ message: text, page: pathname, club }).catch(() => null);
              setState(r?.ok ? "sent" : (r && !r.ok ? r.error : "Couldn't send. Try again."));
            }}
          >
            <p className="text-sm text-muted">Something confusing, broken, or missing? Tell us — it goes to the person who makes ClubOS.</p>
            <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="What would make ClubOS better for your club?" maxLength={4000} />
            {state !== "idle" && state !== "sending" && <p className="text-sm text-danger">{state}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={!text.trim() || state === "sending"}>
              {state === "sending" ? "Sending…" : "Send"}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
