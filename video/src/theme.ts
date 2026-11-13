import { loadFont } from "@remotion/fonts";
import { Easing, staticFile } from "remotion";

// Fonts are bundled in public/fonts so rendering works offline.
const fonts: [string, string, string, string][] = [
  ["Instrument Serif", "instrument-serif-latin-400-normal.woff2", "400", "normal"],
  ["Instrument Serif", "instrument-serif-latin-400-italic.woff2", "400", "italic"],
  ["Inter", "inter-latin-400-normal.woff2", "400", "normal"],
  ["Inter", "inter-latin-500-normal.woff2", "500", "normal"],
  ["Inter", "inter-latin-600-normal.woff2", "600", "normal"],
];
fonts.forEach(([family, file, weight, style]) =>
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, style }),
);

export const serif = "Instrument Serif";
export const sans = "Inter";

export const C = {
  bg: "#050505",
  fg: "#f3f3f1",
  muted: "#8d8d87",
  green: "#2f6e4c",
  greenText: "#7cc29b",
};

/** Apple-ish ease: slow in, slow out. */
export const smooth = Easing.bezier(0.65, 0, 0.35, 1);
export const out = Easing.bezier(0.16, 1, 0.3, 1);
