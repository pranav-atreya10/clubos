/** Colors for events and tasks. Fixed hex values so they read the same in light and dark mode. */
export const COLORS = {
  green: { label: "Green", hex: "#2f9e64" },
  blue: { label: "Blue", hex: "#3b82f6" },
  purple: { label: "Purple", hex: "#8b5cf6" },
  orange: { label: "Orange", hex: "#f59e0b" },
  red: { label: "Red", hex: "#ef4444" },
  gray: { label: "Gray", hex: "#8a8a85" },
} as const;

export type ColorKey = keyof typeof COLORS;
export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];
export const colorHex = (c?: string | null) => (c && c in COLORS ? COLORS[c as ColorKey].hex : null);
