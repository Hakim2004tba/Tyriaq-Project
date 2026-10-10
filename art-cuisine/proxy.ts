import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Fast, DB-free gate in front of the dashboard: redirects anonymous
 * requests to /login before they even reach a server component. Full
 * session validation (expiry, active flag, role/permission checks) still
 * happens in `app/dashboard/layout.tsx` and per-page guards — this is only
 * the first line of defense.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
