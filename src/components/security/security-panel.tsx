"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { startRegistration } from "@simplewebauthn/browser";
import { Check, Copy, Fingerprint, KeyRound, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import {
  beginTotp,
  confirmTotp,
  disableTotp,
  getSecurity,
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  regenerateBackupCodes,
  removePasskey,
} from "@/server/security";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Info = Awaited<ReturnType<typeof getSecurity>>;

function BackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-bg-subtle p-4">
      <p className="text-sm font-semibold">Save your backup codes</p>
      <p className="mt-1 mb-3 text-xs text-muted">
        If you lose your phone, each code gets you in once. This is the only time they’re shown — screenshot them or write them down.
      </p>
      <div className="grid grid-cols-2 gap-1.5 font-mono text-sm">
        {codes.map((c) => (
          <span key={c} className="rounded-lg bg-surface px-2 py-1 text-center">
            {c}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(codes.join("\n"));
            setCopied(true);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy all"}
        </Button>
        <Button size="sm" variant="primary" onClick={onDone}>
          I saved them
        </Button>
      </div>
    </div>
  );
}

export function SecurityPanel({ onChange }: { onChange?: () => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [totp, setTotp] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [offCode, setOffCode] = useState("");
  const [mode, setMode] = useState<"off" | "regen" | null>(null);

  const refresh = useCallback(async () => {
    const r = await getSecurity().catch(() => null);
    setInfo(r);
    onChange?.();
  }, [onChange]);
  useEffect(() => {
    void getSecurity().then(setInfo).catch(() => null);
  }, []);

  if (!info) return <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />;
  if (!info.ok) return <p className="text-sm text-muted">{info.error}</p>;

  const count = info.passkeys.length + (info.totpEnabled ? 1 : 0);

  const addPasskey = async () => {
    setBusy(true);
    setError(null);
    try {
      const o = await passkeyRegisterOptions();
      if (!o.ok) throw new Error(o.error);
      const att = await startRegistration({ optionsJSON: o.options });
      const guess = /iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : /Mac/.test(navigator.userAgent) ? "Mac" : /Android/.test(navigator.userAgent) ? "Android phone" : /Windows/.test(navigator.userAgent) ? "Windows PC" : "Passkey";
      const r = await passkeyRegisterVerify(att, guess);
      if (!r.ok) throw new Error(r.error);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(/cancel|abort|NotAllowed|timed out/i.test(msg) ? "Passkey setup was cancelled." : msg || "Couldn't add a passkey.");
    }
    setBusy(false);
  };

  const startTotp = async () => {
    setError(null);
    const r = await beginTotp();
    if (!r.ok) return setError(r.error);
    setTotp({ secret: r.secret, qr: await QRCode.toDataURL(r.url, { margin: 1, width: 200 }) });
  };

  return (
    <div className="space-y-6">
      <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-3 text-sm", count ? "bg-accent-soft text-accent-text" : "bg-warn-soft text-warn")}>
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        {count
          ? `Two-step sign-in is on (${count} method${count > 1 ? "s" : ""}).`
          : info.required
            ? "Officers and advisors need at least one: a passkey or an authenticator app."
            : "Add a passkey or authenticator app to protect your account."}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Passkeys */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Fingerprint className="size-4" /> Passkeys
          </h3>
          <Button size="sm" variant="accent" onClick={addPasskey} disabled={busy}>
            {busy ? "Waiting…" : "Add a passkey"}
          </Button>
        </div>
        <p className="mb-3 text-sm text-muted">Sign in with Face ID, your fingerprint, or your phone — no password to type. Easiest option.</p>
        {info.passkeys.length > 0 && (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {info.passkeys.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <KeyRound className="size-4 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted">
                    Added {new Date(p.createdAt).toLocaleDateString()}
                    {p.lastUsedAt && ` · last used ${new Date(p.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  aria-label={`Remove ${p.name}`}
                  onClick={async () => {
                    const r = await removePasskey(p.id);
                    if (!r.ok) setError(r.error);
                    await refresh();
                  }}
                  className="rounded-full p-1.5 text-faint hover:bg-surface-2 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Authenticator app */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Smartphone className="size-4" /> Authenticator app
          </h3>
          {!info.totpEnabled && !totp && (
            <Button size="sm" onClick={startTotp}>
              Set up
            </Button>
          )}
        </div>
        <p className="mb-3 text-sm text-muted">
          A 6-digit code from Google Authenticator, Microsoft Authenticator, or your phone’s Passwords app.
        </p>

        {codes && (
          <BackupCodes
            codes={codes}
            onDone={() => {
              setCodes(null);
              void refresh();
            }}
          />
        )}

        {totp && !codes && (
          <div className="flex flex-col gap-4 rounded-2xl border border-line p-4 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={totp.qr} alt="QR code to scan with your authenticator app" className="size-40 rounded-xl bg-white p-1" />
            <form
              className="flex-1 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                const r = await confirmTotp(code);
                if (!r.ok) return setError(r.error);
                setTotp(null);
                setCode("");
                setCodes(r.codes);
              }}
            >
              <p className="text-sm">1. Scan this in your authenticator app.</p>
              <p className="text-xs break-all text-muted">
                Can’t scan? Type this key: <span className="font-mono text-fg">{totp.secret}</span>
              </p>
              <label className="block">
                <Label>2. Enter the 6-digit code</Label>
                <Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="font-mono tracking-widest" />
              </label>
              <Button type="submit" variant="primary" disabled={code.replace(/\s/g, "").length !== 6}>
                Turn on
              </Button>
            </form>
          </div>
        )}

        {info.totpEnabled && !codes && (
          <div className="rounded-2xl border border-line p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-4 text-accent-text" /> On · {info.backupCodesLeft} backup codes left
            </p>
            {mode ? (
              <form
                className="mt-3 flex flex-wrap items-end gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  if (mode === "off") {
                    const r = await disableTotp(offCode);
                    if (!r.ok) return setError(r.error);
                  } else {
                    const r = await regenerateBackupCodes(offCode);
                    if (!r.ok) return setError(r.error);
                    setCodes(r.codes);
                  }
                  setMode(null);
                  setOffCode("");
                  await refresh();
                }}
              >
                <label className="block">
                  <Label>Current code from your app</Label>
                  <Input inputMode="numeric" value={offCode} onChange={(e) => setOffCode(e.target.value)} className="w-36 font-mono tracking-widest" />
                </label>
                <Button type="submit" size="sm" variant={mode === "off" ? "danger" : "primary"}>
                  {mode === "off" ? "Turn off" : "Make new codes"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="mt-2 flex gap-3 text-xs">
                <button onClick={() => setMode("regen")} className="text-muted hover:text-fg">
                  New backup codes
                </button>
                <button onClick={() => setMode("off")} className="text-danger">
                  Turn off
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
