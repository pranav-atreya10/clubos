"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/server/reset";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Logo } from "@/components/app/logo";

function Inner() {
  const token = useSearchParams().get("token") ?? "";
  const [pw, setPw] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | string>("idle");
  return (
    <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-card">
      <h1 className="font-display text-4xl leading-none">New password</h1>
      {state === "done" ? (
        <>
          <p className="mt-4 text-sm text-muted">Done! You’ve been signed out everywhere. Sign in with your new password.</p>
          <Link href="/sign-in"><Button variant="primary" className="mt-5 w-full">Sign in</Button></Link>
        </>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setState("busy");
            const r = await resetPassword(token, pw).catch(() => null);
            setState(r?.ok ? "done" : (r && !r.ok ? r.error : "Couldn't reach the server."));
          }}
        >
          <label className="block">
            <Label hint="At least 8 characters">New password</Label>
            <Input type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          {state !== "idle" && state !== "busy" && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={state === "busy" || !token}>Save new password</Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPassword() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-16">
      <Link href="/" className="mb-10"><Logo /></Link>
      <Suspense><Inner /></Suspense>
    </div>
  );
}
