"use client";

import { ThemeProvider } from "next-themes";
import { SmoothScroll } from "./smooth-scroll";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SmoothScroll />
      {children}
    </ThemeProvider>
  );
}
