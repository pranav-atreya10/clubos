"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckSquare,
  FolderOpen,
  Mail,
  Megaphone,
  PenLine,
  Play,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import SplitText from "@/components/reactbits/SplitText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const quotes = [
  { q: "We sometimes forget to broadcast announcements for club meetings.", who: "Club vice president" },
  { q: "Approval and editing through email with our advisor takes quite some time.", who: "Club officer" },
  { q: "Attendance and consistent attention are two of the largest problems I have.", who: "Leader of multiple clubs" },
];

const steps = [
  { icon: PenLine, title: "Draft", body: "ClubOS writes next week’s message from your calendar. Edit it, or skip weeks with no race." },
  { icon: ShieldCheck, title: "Approve", body: "Your advisor approves, tweaks, or sends it back — right in their own account." },
  { icon: Mail, title: "Send", body: "One tap opens a ready-to-send email to AM Wired. No school Gmail permissions needed." },
];

const features = [
  { icon: Megaphone, title: "Announcements", body: "One feed members actually check." },
  { icon: CalendarDays, title: "Calendar", body: "Meetings, races, and deadlines." },
  { icon: CheckSquare, title: "Tasks", body: "Who’s doing what, by when." },
  { icon: FolderOpen, title: "Resources", body: "Every doc and link in one spot." },
];

function PreviewWindow() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-bg p-3 shadow-card">
      <div className="grid gap-3 md:grid-cols-[200px_1fr]">
        <div className="hidden space-y-2 md:block">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <Logo />
            <p className="mt-4 text-[11px] text-faint">Your club</p>
            <p className="text-sm font-medium">Velocity Racing Club</p>
          </div>
          <div className="space-y-1 rounded-2xl border border-line bg-surface p-2 text-[13px]">
            {["Home", "AM Wired", "Announcements", "Calendar", "Members"].map((l, i) => (
              <div key={l} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${i === 1 ? "bg-surface-2 font-medium" : "text-muted"}`}>
                <span className={`size-5 rounded-md border ${i === 1 ? "border-transparent bg-fg" : "border-line"}`} />
                {l}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Week of</p>
              <p className="font-display text-3xl">Nov 9 – Nov 13</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-text">
              <span className="size-1.5 rounded-full bg-current" /> Approved
            </span>
          </div>
          <p className="mt-5 rounded-xl border border-line bg-bg-subtle p-4 text-[15px] leading-relaxed">
            Attention members! Velocity Racing Club meets this Wednesday at 3:15 PM in Room 214. We’ll walk the track plan for
            Saturday’s Regional Qualifier — the bus leaves at 7:00 AM. Everyone is welcome!
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-fg">
              <Mail className="size-4" /> Open in email app
            </span>
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm">Copy text</span>
          </div>
          <div className="mt-6 border-l border-line pl-4 text-[13px] text-muted">
            <p><span className="font-medium text-fg">Mr. Anderson</span> — approved</p>
            <p className="mt-1"><span className="font-medium text-fg">Dev Mehta</span> — sent to Mr. Anderson for approval</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from(".hero-fade", { opacity: 0, y: 16, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.35 });

      gsap.fromTo(
        ".preview",
        { scale: 0.9, rotateX: 14, y: 40, opacity: 0.4 },
        {
          scale: 1, rotateX: 0, y: 0, opacity: 1, ease: "none",
          scrollTrigger: { trigger: ".preview", start: "top 95%", end: "top 30%", scrub: true },
        },
      );

      gsap.utils.toArray<HTMLElement>(".quote").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, y: 40, duration: 0.9, ease: "power3.out", delay: i * 0.08,
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });

      // Steps light up one by one as you scroll through them
      const stepEls = gsap.utils.toArray<HTMLElement>(".step");
      stepEls.forEach((el) => {
        gsap.fromTo(el, { opacity: 0.25 }, {
          opacity: 1, ease: "none",
          scrollTrigger: { trigger: el, start: "top 80%", end: "top 55%", scrub: true },
        });
      });
      gsap.fromTo(".step-line", { scaleY: 0 }, {
        scaleY: 1, ease: "none", transformOrigin: "top",
        scrollTrigger: { trigger: ".steps", start: "top 70%", end: "bottom 60%", scrub: true },
      });

      gsap.from(".feat", {
        opacity: 0, y: 30, duration: 0.8, ease: "power3.out", stagger: 0.07,
        scrollTrigger: { trigger: ".feats", start: "top 85%" },
      });
    },
    { scope: root },
  );

  const spot = resolvedTheme === "dark" ? "dark" : "light";
  const spotStyle = { "--spotlight-card-surface": "var(--surface)", "--spotlight-card-border": "var(--border)" } as React.CSSProperties;

  return (
    <div ref={root} className="bg-bg">
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-line bg-surface/80 px-4 py-2.5 backdrop-blur-md">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link href="/sign-in" className="hidden h-9 items-center rounded-full px-3 text-sm font-medium text-muted transition-colors hover:text-fg sm:inline-flex">
              Sign in
            </Link>
            <Link href="/sign-up" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-fg px-4 text-sm font-medium text-bg transition-opacity hover:opacity-85">
              Get started <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-36 pb-16 text-center sm:pt-44">
        <div className="hero-fade mb-6 flex justify-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
            <span className="size-1.5 rounded-full bg-accent-text" /> Built with club officers, for club officers
          </p>
        </div>
        <div className="flex justify-center">
        <SplitText
          text="Run your club, not the paperwork."
          tag="h1"
          splitType="words"
          effect="rise"
          mask
          delay={70}
          duration={1.1}
          trigger="load"
          className="max-w-4xl font-display text-[52px] leading-[0.98] tracking-tight sm:text-[88px]"
        />
        </div>
        <p className="hero-fade mx-auto mt-6 max-w-xl text-[17px] text-muted">
          ClubOS gets your announcements approved and out the door, keeps everyone on the same calendar, and helps you spot
          your next leaders.
        </p>
        <div className="hero-fade mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/demo" className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 font-medium text-accent-fg transition-colors hover:bg-accent-hover">
            Try the demo <ArrowRight className="size-4" />
          </Link>
          <Link href="/demovid" className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-6 font-medium transition-colors hover:border-line-strong">
            <Play className="size-4 fill-current" /> Watch the video
          </Link>
        </div>
      </section>

      <section className="px-4 pb-28 [perspective:1400px]">
        <div className="preview mx-auto max-w-5xl">
          <PreviewWindow />
        </div>
      </section>

      {/* Quotes */}
      <section className="border-y border-line bg-surface px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-10 text-sm text-muted">What officers told us</p>
          <div className="grid gap-10 md:grid-cols-3">
            {quotes.map((x) => (
              <figure key={x.q} className="quote">
                <blockquote className="font-display text-[28px] leading-[1.15]">“{x.q}”</blockquote>
                <figcaption className="mt-4 text-sm text-muted">— {x.who}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* AM Wired steps */}
      <section id="how" className="px-4 py-28">
        <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1fr_1.1fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="mb-4 text-sm font-medium text-accent-text">AM Wired, on autopilot</p>
            <h2 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl">Never miss the morning announcements again.</h2>
            <p className="mt-5 max-w-md text-muted">
              Plan weeks ahead. ClubOS reminds you when this week’s message isn’t sent, and your advisor approves without a
              single email thread.
            </p>
          </div>
          <ol className="steps relative space-y-6 pl-10">
            <span className="step-line absolute top-2 bottom-2 left-[15px] w-px bg-accent-text" />
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="step relative rounded-3xl border border-line bg-surface p-7">
                <span className="absolute top-7 -left-10 inline-flex size-8 items-center justify-center rounded-full bg-accent text-accent-fg ring-4 ring-bg">
                  <Icon className="size-4" />
                </span>
                <p className="text-xs text-faint">Step {i + 1}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{title}</p>
                <p className="mt-2 text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Leaders only */}
      <section className="px-4 pb-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-[32px] border border-line bg-[#0b0b0b] p-8 text-white sm:p-14 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm opacity-60">For leaders only</p>
            <h2 className="font-display text-5xl leading-[1.02] tracking-tight">Know who’s ready for the board.</h2>
            <p className="mt-5 max-w-md opacity-70">
              Give each member a private score out of 10 with a quick note. Star your board candidates. Members never see it.
            </p>
          </div>
          <div className="space-y-2">
            {[["Maya Chen", 9, true], ["Nina Okafor", 8, true], ["Jordan Reyes", 8, false], ["Sofia Martins", 6, false]].map(([n, r, c]) => (
              <div key={n as string} className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-4 py-3">
                <span className="w-28 truncate text-sm">{n}</span>
                <div className="flex flex-1 gap-[3px]">
                  {Array.from({ length: 10 }, (_, i) => (
                    <span key={i} className={`h-4 flex-1 max-w-2 rounded-[2px] ${i < (r as number) ? ((r as number) >= 8 ? "bg-[#7cc29b]" : "bg-white") : "bg-white/15"}`} />
                  ))}
                </div>
                <span className="w-10 text-right text-sm tabular-nums opacity-70">{r}/10</span>
                <Star className={`size-4 ${c ? "fill-[#7cc29b] text-[#7cc29b]" : "opacity-30"}`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything else */}
      <section className="px-4 pb-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 max-w-xl font-display text-5xl leading-[1.02] tracking-tight">And the everyday stuff, simplified.</h2>
          <div className="feats grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <SpotlightCard key={title} theme={spot} spotlightColor="rgba(47,110,76,0.35)" style={spotStyle} className="feat !rounded-3xl !p-6">
                <span className="mb-10 inline-flex size-10 items-center justify-center rounded-xl border border-line bg-surface-2">
                  <Icon className="size-5" />
                </span>
                <p className="text-lg font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </SpotlightCard>
            ))}
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
            {["Officer, advisor & member accounts", "Light and dark mode, automatically", "Links to your school’s attendance site", "Works on your phone"].map((x) => (
              <li key={x} className="flex items-center gap-2"><Check className="size-4 text-accent-text" />{x}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-line px-4 py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-4xl">Ready when your club is.</p>
            <p className="mt-2 text-sm text-muted">© {new Date().getFullYear()} ClubOS · Built by Pranav Atreya</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/demo" className="inline-flex h-12 items-center rounded-full border border-line bg-surface px-6 font-medium transition-colors hover:border-line-strong">
              Try the demo
            </Link>
            <Link href="/sign-up" className="inline-flex h-12 items-center gap-2 rounded-full bg-fg px-6 font-medium text-bg transition-opacity hover:opacity-85">
              Get started <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
