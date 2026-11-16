/**
 * The /demo sample club. Off unless NEXT_PUBLIC_DEMO=on is set (e.g. in Vercel → Environment Variables).
 * When off, /demo goes to the video, demo sessions are refused, and "Try the demo" links are hidden.
 */
export const demoEnabled = process.env.NEXT_PUBLIC_DEMO === "on";
