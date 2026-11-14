"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, Trash2 } from "lucide-react";
import { useClub } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/page";

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return d.toLocaleString("en-US", today ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

export default function ChatPage() {
  const messages = useClub((s) => s.messages);
  const members = useClub((s) => s.members);
  const meId = useClub((s) => s.meId);
  const role = useClub((s) => s.role);
  const club = useClub((s) => s.settings.clubName);
  const send = useClub((s) => s.sendMessage);
  const remove = useClub((s) => s.deleteMessage);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Check for new messages every few seconds while the chat is open.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void useClub.getState().refresh();
    }, 5000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    send(body);
    setText("");
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col px-4 pt-6 sm:px-8 lg:h-dvh lg:pt-10">
      <header className="mb-4">
        <h1 className="font-display text-[44px] leading-none tracking-tight">Chat</h1>
        <p className="mt-2 text-sm text-muted">One conversation for everyone in {club}. Ask the whole club anything.</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-line bg-surface p-4 sm:p-6" data-lenis-prevent>
        {messages.length === 0 && <Empty icon={<MessageCircle className="size-6" />} title="No messages yet" body="Say hi or ask the first question." />}
        {messages.map((m) => {
          const mine = m.memberId === meId;
          const who = members.find((x) => x.id === m.memberId);
          const canDelete = mine || role !== "member";
          return (
            <div key={m.id} className={cn("group flex gap-3", mine && "flex-row-reverse")}>
              <Avatar name={m.author} src={who?.avatar} className="mt-5 size-8" />
              <div className={cn("max-w-[75%]", mine && "text-right")}>
                <p className="mb-1 text-xs text-muted">
                  {mine ? "You" : m.author}
                  {who?.role === "advisor" ? " · Advisor" : who?.isOfficer ? ` · ${who.title}` : ""} · {when(m.at)}
                </p>
                <div className={cn("flex items-center gap-1", mine && "flex-row-reverse")}>
                  <p
                    className={cn(
                      "inline-block rounded-2xl px-4 py-2.5 text-left text-[15px] leading-relaxed whitespace-pre-wrap break-words",
                      mine ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg",
                    )}
                  >
                    {m.body}
                  </p>
                  {canDelete && !m.id.startsWith("tmp-") && (
                    <button
                      aria-label="Delete message"
                      onClick={() => remove(m.id)}
                      className="rounded-full p-1.5 text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-0 flex items-end gap-2 bg-bg py-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          aria-label="Message"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Message the club…"
          maxLength={2000}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-fg placeholder:text-faint focus:border-line-strong focus:outline-none"
        />
        <button type="submit" disabled={!text.trim()} aria-label="Send" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg disabled:opacity-40">
          <ArrowUp className="size-5" />
        </button>
      </form>
    </div>
  );
}
