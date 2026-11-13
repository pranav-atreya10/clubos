import { NextResponse, type NextRequest } from "next/server";

/**
 * Quick check before the app loads: send people without a session (or demo) to sign in.
 * This is only a shortcut — every server action checks the session properly again.
 */
export default function proxy(req: NextRequest) {
  const signedIn = req.cookies.has("clubos-session") || req.cookies.has("clubos-demo-user");
  if (!signedIn && req.method === "GET") {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
