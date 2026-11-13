"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { signIn, signUp } from "@/server/auth-actions";
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
  const up = mode === "sign-up";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = up ? await signUp({ name, email, password }).catch(() => null) : await signIn({ email, password }).catch(() => null);
    if (r?.ok) {
      router.replace("/app");
      router.refresh();
      return;
    }
    setBusy(false);
    setError(r?.error ?? "Couldn't reach the server. Check your connection.");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-16">
      <Link href="/" className="mb-10">
        <Logo />
      </Link>
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
      </div>
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
