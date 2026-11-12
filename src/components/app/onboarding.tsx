"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";
import { useClub } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

/** Start a new club, or join one with the invite code an officer shared. */
export function ClubPicker({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const createClub = useClub((s) => s.createClub);
  const joinClub = useClub((s) => s.joinClub);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<{ create?: string; join?: string }>({});

  const go = async (kind: "create" | "join") => {
    setBusy(kind);
    setError({});
    const err = kind === "create" ? await createClub(name) : await joinClub(code);
    setBusy(null);
    if (err) setError({ [kind]: err });
    else onDone?.();
  };

  return (
    <div className={compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) void go("join");
        }}
        className="rounded-3xl border border-line bg-surface p-6"
      >
        <span className="mb-6 inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
          <KeyRound className="size-5" />
        </span>
        <h2 className="text-lg font-semibold">Join a club</h2>
        <p className="mt-1 mb-5 text-sm text-muted">Ask an officer for your club’s invite code.</p>
        <label className="block">
          <Label>Invite code</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7QM2XPA"
            autoCapitalize="characters"
            className="font-mono tracking-widest uppercase"
          />
        </label>
        {error.join && <p className="mt-2 text-sm text-danger">{error.join}</p>}
        <Button type="submit" variant="accent" className="mt-4 w-full" disabled={!code.trim() || busy !== null}>
          {busy === "join" ? "Joining…" : "Join club"} <ArrowRight className="size-4" />
        </Button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void go("create");
        }}
        className="rounded-3xl border border-line bg-surface p-6"
      >
        <span className="mb-6 inline-flex size-10 items-center justify-center rounded-xl bg-surface-2">
          <Sparkles className="size-5" />
        </span>
        <h2 className="text-lg font-semibold">Start a club</h2>
        <p className="mt-1 mb-5 text-sm text-muted">You’ll be its first officer and get a code to invite everyone else.</p>
        <label className="block">
          <Label>Club name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Velocity Racing Club" />
        </label>
        {error.create && <p className="mt-2 text-sm text-danger">{error.create}</p>}
        <Button type="submit" variant="primary" className="mt-4 w-full" disabled={!name.trim() || busy !== null}>
          {busy === "create" ? "Creating…" : "Create club"}
        </Button>
      </form>
    </div>
  );
}

export function Onboarding() {
  const name = useClub((s) => s.userName);
  return (
    <div className="mx-auto max-w-3xl px-4 pt-16 pb-24 sm:px-8">
      <p className="mb-3 text-sm text-muted">Welcome{name ? `, ${name.split(" ")[0]}` : ""}</p>
      <h1 className="mb-3 font-display text-5xl leading-none tracking-tight sm:text-6xl">Let’s find your club.</h1>
      <p className="mb-10 max-w-lg text-muted">Join the club you’re in, or set up a new one if you’re the one running it.</p>
      <ClubPicker />
    </div>
  );
}
