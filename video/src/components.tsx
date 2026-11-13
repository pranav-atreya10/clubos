import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, out, sans, serif, smooth } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Headline that reveals word by word with a blur-up. */
export function Words({
  text,
  start = 0,
  size = 110,
  stagger = 4,
  color = C.fg,
  italicWords = [],
  align = "center",
}: {
  text: string;
  start?: number;
  size?: number;
  stagger?: number;
  color?: string;
  italicWords?: string[];
  align?: "center" | "left";
}) {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        fontFamily: serif,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: "-0.02em",
        color,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: size * 0.24,
      }}
    >
      {text.split(" ").map((w, i) => {
        const t = interpolate(f, [start + i * stagger, start + i * stagger + 18], [0, 1], { ...clamp, easing: out });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: t,
              filter: `blur(${(1 - t) * 14}px)`,
              transform: `translateY(${(1 - t) * size * 0.35}px)`,
              fontStyle: italicWords.includes(w) ? "italic" : "normal",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

export function Eyebrow({ children, start = 0 }: { children: React.ReactNode; start?: number }) {
  const f = useCurrentFrame();
  const t = interpolate(f, [start, start + 15], [0, 1], { ...clamp, easing: out });
  return (
    <div
      style={{
        fontFamily: sans,
        fontSize: 24,
        fontWeight: 500,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: C.greenText,
        opacity: t,
        transform: `translateY(${(1 - t) * 10}px)`,
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

/** Soft green light behind things. */
export function Glow({ opacity = 1, size = 1100, y = "55%" }: { opacity?: number; size?: number; y?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: y,
        width: size,
        height: size * 0.6,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(ellipse at center, rgba(47,110,76,0.55), rgba(47,110,76,0) 65%)`,
        filter: "blur(40px)",
        opacity,
      }}
    />
  );
}

export function LogoMark({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <rect width="32" height="32" rx="9" fill={C.fg} />
      <circle cx="16" cy="16" r="7.5" fill="none" strokeWidth="3" stroke={C.bg} />
      <circle cx="21.3" cy="10.7" r="3" fill={C.greenText} />
    </svg>
  );
}

export type Shot = { fx: number; fy: number; zoom: number };

/**
 * A screenshot in a rounded "window", with a camera that eases from one focus to another.
 * fx/fy are 0–1 positions on the screenshot; zoom 1 = whole screen.
 */
export function Screen({
  src,
  from,
  to,
  moveStart,
  moveEnd,
  width = 1560,
  tilt = 0,
  style,
  children,
}: {
  src: string;
  from: Shot;
  to: Shot;
  moveStart: number;
  moveEnd: number;
  width?: number;
  tilt?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const f = useCurrentFrame();
  const p = interpolate(f, [moveStart, moveEnd], [0, 1], { ...clamp, easing: smooth });
  const fx = from.fx + (to.fx - from.fx) * p;
  const fy = from.fy + (to.fy - from.fy) * p;
  const zoom = from.zoom + (to.zoom - from.zoom) * p;
  const height = width * 0.625;
  // Move the focus point to the centre of the window, but never past the screenshot's edges.
  const maxX = (width * (zoom - 1)) / 2;
  const maxY = (height * (zoom - 1)) / 2;
  const tx = Math.max(-maxX, Math.min(maxX, (0.5 - fx) * width * zoom));
  const ty = Math.max(-maxY, Math.min(maxY, (0.5 - fy) * height * zoom));

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 26,
        overflow: "hidden",
        position: "relative",
        border: "1px solid #2a2a2a",
        boxShadow: "0 60px 140px -40px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.03)",
        transform: `perspective(2400px) rotateX(${tilt}deg)`,
        background: "#0a0a0a",
        ...style,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width,
          height,
          transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
          transformOrigin: "50% 50%",
        }}
      />
      {children}
    </div>
  );
}

export const Fill = AbsoluteFill;
