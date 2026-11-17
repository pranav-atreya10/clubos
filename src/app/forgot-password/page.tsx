"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/server/reset";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Logo } from "@/components/app/logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | string>("idle");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-16">
      <Link href="/" className="mb-10"><Logo /></Link>
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-card">
        <h1 className="font-display text-4xl leading-none">Forgot password</h1>
        {state === "sent" ? (
          <p className="mt-4 text-sm text-muted">If that email has a ClubOS account, a reset link is on its way. It works once and expires in 1 hour. Check spam too.</p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setState("busy");
              const r = await requestPasswordReset(email).catch(() => null);
              setState(r?.ok ? "sent" : (r && !r.ok ? r.error : "Couldn't reach the server."));
            }}
          >
            <p className="text-sm text-muted">We’ll email you a link to choose a new one. Or ask an officer in your club for a reset link.</p>
            <label className="block">
              <Label>School email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {state !== "idle" && state !== "busy" && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={state === "busy"}>Send reset link</Button>
          </form>
        )}
      </div>
      <Link href="/sign-in" className="mt-6 text-sm text-muted hover:text-fg">Back to sign in</Link>
    </div>
  );
}
