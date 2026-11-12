import { AbsoluteFill, Audio, Sequence, getStaticFiles, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, out, sans, smooth } from "./theme";
import { Eyebrow, Glow, LogoMark, Screen, Words, type Shot } from "./components";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Scene lengths (30 fps). Total = 900 frames = 30 s.
const S = {
  intro: 96,
  list: 66,
  logo: 78,
  home: 150,
  draft: 120,
  approve: 126,
  members: 114,
  grid: 90,
  end: 140,
};
const order = Object.keys(S) as (keyof typeof S)[];
const OVERLAP = 10; // crossfade frames between scenes
export const DURATION = Object.values(S).reduce((a, b) => a + b, 0) - OVERLAP * (order.length - 1);

/** Fades a scene in and out so scenes crossfade. */
function Scene({ len, children, bg = true }: { len: number; children: React.ReactNode; bg?: boolean }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, OVERLAP, len - OVERLAP, len], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity: o, background: bg ? C.bg : undefined }}>{children}</AbsoluteFill>;
}

function Center({ children }: { children: React.ReactNode }) {
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 120 }}>{children}</AbsoluteFill>;
}

/* 1 — Hook */
function Intro() {
  return (
    <Center>
      <Words text="Running a club" start={6} size={128} />
      <div style={{ height: 8 }} />
      <Words text="is a lot." start={30} size={128} color={C.muted} italicWords={["lot."]} />
    </Center>
  );
}

/* 2 — Pain points, quick cuts */
function List() {
  const f = useCurrentFrame();
  const items = ["Announcements.", "Approvals.", "People."];
  const i = Math.min(items.length - 1, Math.floor(f / 20));
  const local = f - i * 20;
  const t = interpolate(local, [0, 8], [0, 1], { ...clamp, easing: out });
  return (
    <Center>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 150,
          letterSpacing: "-0.05em",
          color: C.fg,
          opacity: t,
          transform: `scale(${1.08 - t * 0.08})`,
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
  const s = interpolate(f, [4, 34], [0.6, 1], { ...clamp, easing: out });
  const o = interpolate(f, [4, 24], [0, 1], clamp);
  const glow = interpolate(f, [10, 50], [0, 1], { ...clamp, easing: smooth });
  const text = interpolate(f, [22, 46], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill>
      <Glow opacity={glow * 0.8} y="50%" />
      <Center>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ transform: `scale(${s})`, opacity: o }}>
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

/** Caption block that sits above a screen. */
function Caption({ eyebrow, text, start = 4 }: { eyebrow: string; text: string; start?: number }) {
  return (
    <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center" }}>
      <Eyebrow start={start}>{eyebrow}</Eyebrow>
      <Words text={text} start={start + 4} size={78} stagger={3} />
    </div>
  );
}

/** Screen that rises in with a 3D tilt, then the camera moves. */
function ScreenScene({
  src,
  eyebrow,
  caption,
  from,
  to,
  len,
  children,
}: {
  src: string;
  eyebrow: string;
  caption: string;
  from: Shot;
  to: Shot;
  len: number;
  children?: React.ReactNode;
}) {
  const f = useCurrentFrame();
  const rise = interpolate(f, [0, 34], [0, 1], { ...clamp, easing: out });
  const drift = interpolate(f, [0, len], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Glow opacity={0.55} y="78%" size={1500} />
      <Caption eyebrow={eyebrow} text={caption} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 262,
          transform: `translateX(-50%) translateY(${(1 - rise) * 260}px) scale(${0.94 + rise * 0.06 + drift * 0.02})`,
          opacity: rise,
        }}
      >
        <Screen
          src={src}
          width={1240}
          tilt={(1 - rise) * 22}
          from={from}
          to={to}
          moveStart={34}
          moveEnd={Math.min(len - 18, 34 + 70)}
        >
          {children}
        </Screen>
      </div>
    </AbsoluteFill>
  );
}

/* 4 — Home: the AM Wired reminder */
function Home() {
  return (
    <ScreenScene
      len={S.home}
      src="shots/home.png"
      eyebrow="AM Wired"
      caption="Never miss the morning announcements."
      from={{ fx: 0.5, fy: 0.5, zoom: 1 }}
      to={{ fx: 0.6, fy: 0.3, zoom: 1.75 }}
    />
  );
}

/* 5 — Auto-filled draft */
function Draft() {
  return (
    <ScreenScene
      len={S.draft}
      src="shots/wired-draft.png"
      eyebrow="Drafts"
      caption="Written for you, from your calendar."
      from={{ fx: 0.5, fy: 0.5, zoom: 1.05 }}
      to={{ fx: 0.7, fy: 0.45, zoom: 1.7 }}
    />
  );
}

/* 6 — Advisor approves, cursor clicks */
function Approve() {
  const f = useCurrentFrame();
  const W = 1240;
  const H = W * 0.625;
  const shot = { fx: 0.45, fy: 0.45, zoom: 1.45 };
  // Approve button on the screenshot (0–1 coords), mapped through the camera.
  const bx = 0.284, by = 0.505;
  const maxX = (W * (shot.zoom - 1)) / 2, maxY = (H * (shot.zoom - 1)) / 2;
  const tx = Math.max(-maxX, Math.min(maxX, (0.5 - shot.fx) * W * shot.zoom));
  const ty = Math.max(-maxY, Math.min(maxY, (0.5 - shot.fy) * H * shot.zoom));
  const px = W / 2 + (bx - 0.5) * W * shot.zoom + tx;
  const py = H / 2 + (by - 0.5) * H * shot.zoom + ty;

  const move = interpolate(f, [30, 66], [0, 1], { ...clamp, easing: smooth });
  const cx = px + 260 * (1 - move);
  const cy = py + 170 * (1 - move);
  const press = interpolate(f, [68, 72, 78], [1, 0.85, 1], clamp);
  const ring = interpolate(f, [70, 92], [0, 1], clamp);
  const swap = interpolate(f, [80, 92], [0, 1], clamp);

  return (
    <ScreenScene
      len={S.approve}
      src="shots/approvals.png"
      eyebrow="Advisor"
      caption="Approved in one tap. No email chains."
      from={shot}
      to={shot}
    >
      {/* After the click, cross to the approved screen */}
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
            style={{ position: "absolute", left: cx - 6, top: cy - 4, transform: `scale(${press})`, filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))", opacity: interpolate(f, [24, 32], [0, 1], clamp) }}
          >
            <path d="M5 3l14 8-6.5 1.5L9 19z" fill="#fff" stroke="#000" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </ScreenScene>
  );
}

/* 7 — Private leadership ratings */
function Members() {
  return (
    <ScreenScene
      len={S.members}
      src="shots/members.png"
      eyebrow="Leaders only"
      caption="Spot your next board. Privately."
      from={{ fx: 0.5, fy: 0.5, zoom: 1.05 }}
      to={{ fx: 0.72, fy: 0.55, zoom: 1.6 }}
    />
  );
}

/* 8 — Everything else */
function Grid() {
  const f = useCurrentFrame();
  const cards = ["shots/calendar.png", "shots/tasks.png", "shots/resources.png"];
  return (
    <AbsoluteFill>
      <Glow opacity={0.5} y="70%" size={1600} />
      <Caption eyebrow="And the rest" text="Calendar. Tasks. Resources." />
      <div style={{ position: "absolute", top: 400, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 36 }}>
        {cards.map((src, i) => {
          const t = interpolate(f, [8 + i * 6, 40 + i * 6], [0, 1], { ...clamp, easing: out });
          const float = Math.sin((f + i * 20) / 22) * 6;
          return (
            <div key={src} style={{ opacity: t, transform: `translateY(${(1 - t) * 160 + float}px) rotateY(${(i - 1) * -10}deg)`, perspective: 2000 }}>
              <Screen src={src} width={540} from={{ fx: 0.5, fy: 0.5, zoom: 1 }} to={{ fx: 0.6, fy: 0.4, zoom: 1.25 }} moveStart={20} moveEnd={90} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* 9 — End card */
function End() {
  const f = useCurrentFrame();
  const o = interpolate(f, [4, 26], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill>
      <Glow opacity={0.7} y="50%" />
      <Center>
        <div style={{ opacity: o, transform: `scale(${0.9 + o * 0.1})`, marginBottom: 48 }}>
          <LogoMark size={120} />
        </div>
        <Words text="Run your club, not the paperwork." start={14} size={104} stagger={3} italicWords={["paperwork."]} />
        <div style={{ marginTop: 36, fontFamily: sans, fontSize: 28, color: C.muted, opacity: interpolate(f, [40, 56], [0, 1], clamp) }}>
          ClubOS
        </div>
      </Center>
    </AbsoluteFill>
  );
}

const SCENES: Record<keyof typeof S, () => React.ReactElement> = {
  intro: Intro,
  list: List,
  logo: Logo,
  home: Home,
  draft: Draft,
  approve: Approve,
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
      volume={(f) => interpolate(f, [0, 20, durationInFrames - 45, durationInFrames], [0, 0.7, 0.7, 0], clamp)}
    />
  );
}

export function ClubOSDemo() {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {order.map((k) => {
        const Comp = SCENES[k];
        const from = at;
        at += S[k] - OVERLAP;
        return (
          <Sequence key={k} from={from} durationInFrames={S[k]} name={k}>
            <Scene len={S[k]}>
              <Comp />
            </Scene>
          </Sequence>
        );
      })}
      <Music />
    </AbsoluteFill>
  );
}
