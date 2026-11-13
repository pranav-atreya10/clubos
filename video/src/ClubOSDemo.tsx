import { createContext, useContext } from "react";
import { AbsoluteFill, Audio, Sequence, getStaticFiles, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, out, sans, smooth } from "./theme";
import { Eyebrow, Glow, LogoMark, Screen, Words, type Shot } from "./components";
import { BEATS } from "./beats";

const FPS = 30;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const beatFrame = (i: number) => Math.round(BEATS[i] * FPS);
const BEAT = (BEATS[70] - BEATS[30]) / 40 * FPS; // ≈18 frames

/**
 * Every scene starts on a bar (downbeat). Numbers are beat indices in the song.
 * The end card lands on beat 62 — the start of the chorus.
 */
const CUTS = [
  { key: "intro", beat: 0 },
  { key: "list", beat: 6 },
  { key: "logo", beat: 10 },
  { key: "home", beat: 14 },
  { key: "draft", beat: 22 },
  { key: "approve", beat: 30 },
  { key: "send", beat: 38 },
  { key: "members", beat: 46 },
  { key: "grid", beat: 54 },
  { key: "end", beat: 62 },
] as const;
const END_BEAT = 70; // two bars into the chorus
const FADE = 5; // frames of crossfade before each cut
export const DURATION = beatFrame(END_BEAT) + 12;

/** Inside a scene: frame (relative to the scene) of the scene's k-th beat. */
const SceneBeat = createContext<(k: number) => number>(() => 0);
const useBeat = () => useContext(SceneBeat);

/** 1 right on a beat, decaying quickly — for subtle pulses. */
function usePulse() {
  const f = useCurrentFrame();
  const { from } = useContext(SceneOffset);
  const g = f + from;
  let last = -999;
  for (const b of BEATS) {
    const bf = b * FPS;
    if (bf <= g) last = bf;
    else break;
  }
  return Math.exp(-(g - last) / 5);
}
const SceneOffset = createContext({ from: 0 });

function Scene({ len, children }: { len: number; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, FADE, len - 2, len], [0, 1, 1, 1], clamp);
  return <AbsoluteFill style={{ opacity: o, background: C.bg }}>{children}</AbsoluteFill>;
}

function Center({ children }: { children: React.ReactNode }) {
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 120 }}>{children}</AbsoluteFill>;
}

/* 1 — Hook */
function Intro() {
  const b = useBeat();
  return (
    <Center>
      <Words text="Running a club" start={b(0) - 3} size={128} stagger={Math.round(BEAT / 2)} />
      <div style={{ height: 8 }} />
      <Words text="is a lot." start={b(2) - 3} size={128} color={C.muted} italicWords={["lot."]} stagger={Math.round(BEAT / 2)} />
    </Center>
  );
}

/* 2 — One word per beat */
function List() {
  const f = useCurrentFrame();
  const b = useBeat();
  const items = ["Announcements.", "Approvals.", "Meetings.", "People."];
  let i = 0;
  for (let k = 0; k < items.length; k++) if (f >= b(k) - 1) i = k;
  const local = f - (b(i) - 1);
  const t = interpolate(local, [0, 6], [0, 1], { ...clamp, easing: out });
  return (
    <Center>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 150,
          letterSpacing: "-0.05em",
          color: i === items.length - 1 ? C.greenText : C.fg,
          opacity: t,
          transform: `scale(${1.1 - t * 0.1})`,
          filter: `blur(${(1 - t) * 10}px)`,
        }}
      >
        {items[i]}
      </div>
    </Center>
  );
}

/* 3 — Reveal */
function Logo() {
  const f = useCurrentFrame();
  const b = useBeat();
  const pulse = usePulse();
  const s = interpolate(f, [b(0) - 2, b(0) + 10], [0.55, 1], { ...clamp, easing: out });
  const o = interpolate(f, [b(0) - 2, b(0) + 4], [0, 1], clamp);
  const text = interpolate(f, [b(1) - 2, b(1) + 14], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill>
      <Glow opacity={0.55 + pulse * 0.35} y="50%" />
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ transform: `scale(${s * (1 + pulse * 0.025)})`, opacity: o }}>
            <LogoMark size={150} />
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 140,
              letterSpacing: "-0.05em",
              color: C.fg,
              opacity: text,
              transform: `translateX(${(1 - text) * -30}px)`,
              clipPath: `inset(0 ${(1 - text) * 100}% 0 0)`,
            }}
          >
            ClubOS
          </div>
        </div>
      </Center>
    </AbsoluteFill>
  );
}

function Caption({ eyebrow, text }: { eyebrow: string; text: string }) {
  const b = useBeat();
  return (
    <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center" }}>
      <Eyebrow start={b(0) - 2}>{eyebrow}</Eyebrow>
      <Words text={text} start={b(1) - 3} size={78} stagger={Math.round(BEAT / 4)} />
    </div>
  );
}

const W = 1240;

/** Screen rises in on the downbeat, then the camera moves over the next bar. */
function ScreenScene({
  src,
  eyebrow,
  caption,
  from,
  to,
  move = [2, 6],
  children,
}: {
  src: string;
  eyebrow: string;
  caption: string;
  from: Shot;
  to: Shot;
  move?: [number, number];
  children?: React.ReactNode;
}) {
  const f = useCurrentFrame();
  const b = useBeat();
  const pulse = usePulse();
  const rise = interpolate(f, [b(0) - 2, b(0) + 2 * BEAT], [0, 1], { ...clamp, easing: out });
  const drift = interpolate(f, [b(0), b(8)], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Glow opacity={0.45 + pulse * 0.2} y="78%" size={1500} />
      <Caption eyebrow={eyebrow} text={caption} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 262,
          transform: `translateX(-50%) translateY(${(1 - rise) * 260}px) scale(${0.94 + rise * 0.06 + drift * 0.02})`,
          opacity: Math.min(1, rise * 1.6),
        }}
      >
        <Screen src={src} width={W} tilt={(1 - rise) * 22} from={from} to={to} moveStart={b(move[0])} moveEnd={b(move[1])}>
          {children}
        </Screen>
      </div>
    </AbsoluteFill>
  );
}

function Home() {
  return (
    <ScreenScene
      src="shots/home.png"
      eyebrow="AM Wired"
      caption="Never miss the morning announcements."
      from={{ fx: 0.5, fy: 0.5, zoom: 1 }}
      to={{ fx: 0.6, fy: 0.3, zoom: 1.75 }}
    />
  );
}

function Draft() {
  return (
    <ScreenScene
      src="shots/wired-draft.png"
      eyebrow="Drafts"
      caption="Written for you, from your calendar."
      from={{ fx: 0.5, fy: 0.5, zoom: 1.05 }}
      to={{ fx: 0.7, fy: 0.45, zoom: 1.7 }}
    />
  );
}

/* Advisor approves — the click lands on a downbeat */
function Approve() {
  const f = useCurrentFrame();
  const b = useBeat();
  const H = W * 0.625;
  const shot = { fx: 0.45, fy: 0.45, zoom: 1.45 };
  const bx = 0.284, by = 0.505; // Approve button on the screenshot
  const maxX = (W * (shot.zoom - 1)) / 2, maxY = (H * (shot.zoom - 1)) / 2;
  const tx = Math.max(-maxX, Math.min(maxX, (0.5 - shot.fx) * W * shot.zoom));
  const ty = Math.max(-maxY, Math.min(maxY, (0.5 - shot.fy) * H * shot.zoom));
  const px = W / 2 + (bx - 0.5) * W * shot.zoom + tx;
  const py = H / 2 + (by - 0.5) * H * shot.zoom + ty;

  const click = b(4);
  const move = interpolate(f, [b(2), click - 3], [0, 1], { ...clamp, easing: smooth });
  const cx = px + 260 * (1 - move);
  const cy = py + 170 * (1 - move);
  const press = interpolate(f, [click - 3, click, click + 6], [1, 0.82, 1], clamp);
  const ring = interpolate(f, [click, click + 18], [0, 1], clamp);
  const swap = interpolate(f, [b(5) - 4, b(5) + 2], [0, 1], clamp);

  return (
    <ScreenScene src="shots/approvals.png" eyebrow="Advisor" caption="Approved in one tap. No email chains." from={shot} to={shot}>
      <div style={{ position: "absolute", inset: 0, opacity: swap }}>
        <Screen src="shots/wired-approved.png" width={W} from={{ fx: 0.6, fy: 0.55, zoom: 1.45 }} to={{ fx: 0.6, fy: 0.55, zoom: 1.45 }} moveStart={0} moveEnd={1} style={{ border: "none", borderRadius: 0, boxShadow: "none" }} />
      </div>
      {swap < 1 && (
        <>
          <div
            style={{
              position: "absolute",
              left: px - 60 * (1 + ring),
              top: py - 60 * (1 + ring),
              width: 120 * (1 + ring),
              height: 120 * (1 + ring),
              borderRadius: "50%",
              border: `3px solid ${C.greenText}`,
              opacity: ring > 0 ? 1 - ring : 0,
            }}
          />
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            style={{ position: "absolute", left: cx - 6, top: cy - 4, transform: `scale(${press})`, filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))", opacity: interpolate(f, [b(1), b(2)], [0, 1], clamp) }}
          >
            <path d="M5 3l14 8-6.5 1.5L9 19z" fill="#fff" stroke="#000" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </ScreenScene>
  );
}

/* Then send it from your own email */
function Send() {
  return (
    <ScreenScene
      src="shots/wired-approved.png"
      eyebrow="Send"
      caption="Then send it from your own email."
      from={{ fx: 0.6, fy: 0.55, zoom: 1.2 }}
      to={{ fx: 0.53, fy: 0.64, zoom: 2.1 }}
    />
  );
}

function Members() {
  return (
    <ScreenScene
      src="shots/members.png"
      eyebrow="Leaders only"
      caption="Spot your next board. Privately."
      from={{ fx: 0.5, fy: 0.5, zoom: 1.05 }}
      to={{ fx: 0.72, fy: 0.55, zoom: 1.6 }}
    />
  );
}

/* Three cards, one per beat */
function Grid() {
  const f = useCurrentFrame();
  const b = useBeat();
  const pulse = usePulse();
  const cards = ["shots/calendar.png", "shots/tasks.png", "shots/resources.png"];
  return (
    <AbsoluteFill>
      <Glow opacity={0.4 + pulse * 0.2} y="70%" size={1600} />
      <Caption eyebrow="And the rest" text="Calendar. Tasks. Resources." />
      <div style={{ position: "absolute", top: 400, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 36 }}>
        {cards.map((src, i) => {
          const t = interpolate(f, [b(1 + i) - 2, b(1 + i) + 12], [0, 1], { ...clamp, easing: out });
          const float = Math.sin((f + i * 20) / 22) * 6;
          return (
            <div key={src} style={{ opacity: t, transform: `translateY(${(1 - t) * 160 + float}px) rotateY(${(i - 1) * -10}deg)` }}>
              <Screen src={src} width={560} from={{ fx: 0.5, fy: 0.5, zoom: 1 }} to={{ fx: 0.6, fy: 0.4, zoom: 1.25 }} moveStart={b(4)} moveEnd={b(8)} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* End card — lands on the chorus */
function End() {
  const f = useCurrentFrame();
  const b = useBeat();
  const pulse = usePulse();
  const hit = interpolate(f, [b(0) - 2, b(0) + 8], [0, 1], { ...clamp, easing: out });
  const flash = interpolate(f, [b(0), b(0) + 20], [1, 0], clamp);
  const tail = interpolate(f, [b(END_BEAT - 62) - 6, b(END_BEAT - 62) + 12], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: tail }}>
      <Glow opacity={0.6 + pulse * 0.35 + flash * 0.6} y="50%" size={1200 + flash * 500} />
      <Center>
        <div style={{ opacity: hit, transform: `scale(${(0.7 + hit * 0.3) * (1 + pulse * 0.03)})`, marginBottom: 48 }}>
          <LogoMark size={120} />
        </div>
        <Words text="Run your club, not the paperwork." start={b(1) - 3} size={104} stagger={Math.round(BEAT / 2)} italicWords={["paperwork."]} />
        <div style={{ marginTop: 36, fontFamily: sans, fontSize: 28, color: C.muted, opacity: interpolate(f, [b(6) - 2, b(6) + 10], [0, 1], clamp) }}>
          ClubOS
        </div>
      </Center>
    </AbsoluteFill>
  );
}

const SCENES: Record<(typeof CUTS)[number]["key"], () => React.ReactElement> = {
  intro: Intro,
  list: List,
  logo: Logo,
  home: Home,
  draft: Draft,
  approve: Approve,
  send: Send,
  members: Members,
  grid: Grid,
  end: End,
};

function Music() {
  const { durationInFrames } = useVideoConfig();
  const has = getStaticFiles().some((f) => f.name === "music.mp3");
  if (!has) return null;
  return (
    <Audio
      src={staticFile("music.mp3")}
      volume={(f) => interpolate(f, [0, 6, durationInFrames - 30, durationInFrames], [0.7, 0.7, 0.7, 0], clamp)}
    />
  );
}

export function ClubOSDemo() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {CUTS.map((c, i) => {
        const Comp = SCENES[c.key];
        // Scene i becomes fully visible exactly on its downbeat.
        const start = i === 0 ? 0 : beatFrame(c.beat) - FADE;
        const next = i < CUTS.length - 1 ? beatFrame(CUTS[i + 1].beat) : DURATION;
        const len = next - start;
        const b = (k: number) => beatFrame(c.beat + k) - start;
        return (
          <Sequence key={c.key} from={start} durationInFrames={len} name={c.key}>
            <SceneOffset.Provider value={{ from: start }}>
              <SceneBeat.Provider value={b}>
                <Scene len={len}>
                  <Comp />
                </Scene>
              </SceneBeat.Provider>
            </SceneOffset.Provider>
          </Sequence>
        );
      })}
      <Music />
    </AbsoluteFill>
  );
}
