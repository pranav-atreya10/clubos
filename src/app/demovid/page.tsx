import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/app/logo";

export const metadata: Metadata = {
  title: "Demo video",
  description: "See ClubOS in 43 seconds.",
};

export default function DemoVideoPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-8">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/sign-in" className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-muted hover:text-fg">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-14 pb-24 sm:px-8 sm:pt-20">
        <p className="mb-4 text-sm font-medium text-accent-text">43 seconds</p>
        <h1 className="mb-10 max-w-3xl font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">See ClubOS in action.</h1>

        <div className="overflow-hidden rounded-[28px] border border-line bg-black shadow-card">
          <video
            className="block aspect-video w-full"
            src="/demo/clubos-demo.mp4"
            poster="/demo/poster.jpg"
            controls
            playsInline
            preload="metadata"
          >
            Your browser can’t play this video. <a href="/demo/clubos-demo.mp4">Download it instead.</a>
          </video>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/demo" className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 font-medium text-accent-fg transition-colors hover:bg-accent-hover">
            Try the demo <ArrowRight className="size-4" />
          </Link>
          <Link href="/sign-up" className="inline-flex h-12 items-center rounded-full border border-line bg-surface px-6 font-medium transition-colors hover:border-line-strong">
            Get started
          </Link>
        </div>
      </main>
    </div>
  );
}
