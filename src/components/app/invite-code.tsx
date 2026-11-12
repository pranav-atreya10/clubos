"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useClub } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function InviteCode() {
  const code = useClub((s) => s.inviteCode);
  const newInvite = useClub((s) => s.newInvite);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (!code) return null;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-2xl border border-line bg-bg-subtle px-5 py-3 font-mono text-2xl font-semibold tracking-[0.25em]">{code}</span>
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="mt-4 text-sm">
        {!confirm ? (
          <button onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 text-muted hover:text-fg">
            <RefreshCw className="size-3.5" /> Make a new code
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
            <button onClick={() => setConfirm(false)} className="text-muted hover:text-fg">
              Cancel
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
