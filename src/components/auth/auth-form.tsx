"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { signIn, signOut, signUp } from "@/server/auth-actions";
import { passkeyLoginOptions, passkeyLoginVerify, secondStepInfo, verifySecondStep } from "@/server/security";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Logo } from "@/components/app/logo";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2, setStep2] = useState<{ totp: boolean; passkey: boolean; name: string } | null>(null);
  const [code, setCode] = useState("");
  const up = mode === "sign-up";

  const done = () => {
    router.replace("/app");
    router.refresh();
  };

  /** Passkey: the whole sign-in on its own, or the second step after a password. */
  const signInWithPasskey = async () => {
    setBusy(true);
    setError(null);
    try {
      const o = await passkeyLoginOptions();
      const assertion = await startAuthentication({ optionsJSON: o.options });
      const r = await passkeyLoginVerify(assertion);
      if (r.ok) return done();
      setError(r.error);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(/cancel|abort|NotAllowed|timed out/i.test(msg) ? "Passkey sign-in was cancelled." : "Couldn't use a passkey on this device.");
    }
    setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = up ? await signUp({ name, email, password }).catch(() => null) : await signIn({ email, password }).catch(() => null);
    if (r?.ok && "mfa" in r && r.mfa) {
      const info = await secondStepInfo();
      setBusy(false);
      if (info.ok) setStep2(info);
      return;
    }
    if (r?.ok) return done();
    setBusy(false);
    setError(r?.error ?? "Couldn't reach the server. Check your connection.");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-16">
      <Link href="/" className="mb-10">
        <Logo />
      </Link>
      {step2 ? (
        <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-card">
          <h1 className="font-display text-4xl leading-none">One more step</h1>
          <p className="mt-2 mb-7 text-sm text-muted">Hi {step2.name}. Confirm it’s you.</p>
          {step2.passkey && (
            <Button variant="accent" className="mb-4 w-full" onClick={signInWithPasskey} disabled={busy}>
              <Fingerprint className="size-4" /> Use my passkey
            </Button>
          )}
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              const r = await verifySecondStep(code).catch(() => null);
              if (r?.ok) return done();
              setBusy(false);
              setError(r && !r.ok ? r.error : "Couldn't reach the server.");
            }}
          >
            <label className="block">
              <Label>{step2.totp ? "Code from your authenticator app, or a backup code" : "Backup code"}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="text" autoComplete="one-time-code" placeholder={step2.totp ? "123456" : "abcd-efgh"} className="font-mono tracking-widest" autoFocus={!step2.passkey} />
            </label>
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" className="w-full" disabled={busy || !code.trim()}>
              Continue
            </Button>
          </form>
          <button
            onClick={async () => {
              await signOut();
              setStep2(null);
              setCode("");
              setError(null);
            }}
            className="mt-4 w-full text-center text-xs text-faint hover:text-fg"
          >
            Start over
          </button>
        </div>
      ) : (
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-card">
        <h1 className="font-display text-4xl leading-none">{up ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 mb-7 text-sm text-muted">
          {up ? "Students and advisors both sign up here. Then start a club or join one with an invite code." : "Sign in to your club."}
        </p>
        <form onSubmit={submit} className="space-y-4">
          {up && (
            <label className="block">
              <Label>Your name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="First Last" required />
            </label>
          )}
          <label className="block">
            <Label>School email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@school.edu" required />
          </label>
          <label className="block">
            <Label hint={up ? "At least 8 characters" : undefined}>Password</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={up ? "new-password" : "current-password"}
                minLength={up ? 8 : undefined}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-faint hover:text-fg"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? (up ? "Creating…" : "Signing in…") : up ? "Create account" : "Sign in"} {!busy && <ArrowRight className="size-4" />}
          </Button>
        </form>
        {!up && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <Button className="w-full" onClick={signInWithPasskey} disabled={busy}>
              <Fingerprint className="size-4" /> Sign in with a passkey
            </Button>
          </>
        )}
      </div>
      )}
      <p className="mt-6 text-sm text-muted">
        {up ? "Already have an account? " : "New to ClubOS? "}
        <Link href={up ? "/sign-in" : "/sign-up"} className="font-medium text-accent-text underline-offset-4 hover:underline">
          {up ? "Sign in" : "Create an account"}
        </Link>
      </p>
      <Link href="/demo" className="mt-2 text-sm text-faint hover:text-fg">
        Just looking? Try the demo
      </Link>
    </div>
  );
}
