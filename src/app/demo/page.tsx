import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { DemoPicker } from "./demo-picker";

export const metadata: Metadata = {
  title: "Try the demo",
  description: "Try ClubOS with a sample club — no account needed.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-8">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/sign-in" className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-muted hover:text-fg">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-16 pb-24 sm:px-8 sm:pt-24">
        <p className="mb-4 text-sm font-medium text-accent-text">No account needed</p>
        <h1 className="max-w-3xl font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">Try ClubOS with a sample club.</h1>
        <p className="mt-5 mb-12 max-w-xl text-[17px] text-muted">
          Pick who you want to be. You can switch between them anytime from the top of the app.
        </p>

        <DemoPicker />

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>The demo is shared by everyone trying it and resets every day — don’t put real info in it.</p>
          <Link href="/demovid" className="inline-flex items-center gap-2 font-medium text-fg hover:underline underline-offset-4">
            <Play className="size-4 fill-current" /> Watch the 43-second video
          </Link>
        </div>
      </main>
    </div>
  );
}
