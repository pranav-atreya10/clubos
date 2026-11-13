"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useClub } from "@/lib/store";
import { Button } from "@/components/ui/button";

function CodeRow({ code, title, body }: { code: string; title: string; body: string }) {
  const newInvite = useClub((s) => s.newInvite);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mb-3 text-xs text-muted">{body}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-2xl border border-line bg-bg-subtle px-4 py-2.5 font-mono text-xl font-semibold tracking-[0.2em] break-all">{code}</span>
        <Button
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="mt-2 text-xs">
        {!confirm ? (
          <button onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 text-muted hover:text-fg">
            <RefreshCw className="size-3" /> Make a new code
          </button>
        ) : (
          <p className="flex flex-wrap items-center gap-3 text-muted">
            The old code will stop working.
            <button
              onClick={() => {
                newInvite();
                setConfirm(false);
              }}
              className="font-medium text-danger"
            >
              Make new code
            </button>
            <button onClick={() => setConfirm(false)} className="hover:text-fg">
              Cancel
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export function InviteCode() {
  const code = useClub((s) => s.inviteCode);
  if (!code) return null;
  return (
    <div className="space-y-6">
      <CodeRow
        code={code}
        title="Invite code"
        body="Share with everyone, including your advisor. They join as members; make your advisor “Advisor” in Members."
      />
    </div>
  );
}
