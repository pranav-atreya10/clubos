"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { useClub } from "@/lib/store";
import { setAvatar, updateProfile } from "@/server/security";
import { Page, PageHeader, Card } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { SecurityPanel } from "@/components/security/security-panel";

/** Shrinks a photo to a 256px square JPEG in the browser before uploading. */
async function toSquareJpeg(file: File) {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function ProfilePage() {
  const name = useClub((s) => s.userName);
  const avatar = useClub((s) => s.myAvatar);
  const demo = useClub((s) => s.demo);
  const load = useClub((s) => s.load);
  const [draft, setDraft] = useState(name);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (demo) {
    return (
      <Page className="max-w-3xl">
        <PageHeader title="Profile" subtitle="Demo people can’t change their profile. Create an account to add your photo and passkeys." />
      </Page>
    );
  }

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await setAvatar(await toSquareJpeg(f));
      setMsg(r.ok ? null : r.error);
      await load();
    } catch {
      setMsg("Couldn’t use that picture. Try a JPG or PNG.");
    }
    setBusy(false);
  };

  return (
    <Page className="max-w-3xl">
      <PageHeader title="Profile" subtitle="Your picture and name show up for everyone in your clubs." />
      <div className="space-y-4">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar name={name} src={avatar} className="size-24 text-2xl" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                aria-label="Change profile picture"
                className="absolute -right-1 -bottom-1 inline-flex size-9 items-center justify-center rounded-full border-4 border-surface bg-fg text-bg"
              >
                <Camera className="size-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </div>
            <form
              className="flex flex-1 flex-wrap items-end gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await updateProfile(draft);
                setMsg(r.ok ? "Saved." : r.error);
                await load();
              }}
            >
              <label className="block min-w-48 flex-1">
                <Label>Your name</Label>
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} />
              </label>
              <Button type="submit" variant="primary" disabled={!draft.trim() || draft === name}>
                Save
              </Button>
            </form>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            {avatar && (
              <button
                onClick={async () => {
                  await setAvatar(null);
                  await load();
                }}
                className="inline-flex items-center gap-1.5 text-muted hover:text-danger"
              >
                <Trash2 className="size-3.5" /> Remove picture
              </button>
            )}
            {busy && <span className="text-muted">Uploading…</span>}
            {msg && <span className="text-muted">{msg}</span>}
          </div>
        </Card>

        <Card id="security" className="p-6 sm:p-8">
          <h2 className="mb-1 font-display text-3xl">Security</h2>
          <p className="mb-6 text-sm text-muted">Two-step sign-in. Officers and advisors need at least one.</p>
          <SecurityPanel onChange={() => void load()} />
        </Card>
      </div>
    </Page>
  );
}
