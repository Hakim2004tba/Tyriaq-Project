import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/** Everything behind the app shell. */
const PROTECTED = ["/dashboard", "/projects", "/calendar", "/spaces", "/settings", "/onboarding"];

/** Pages a signed-in user has no reason to see. */
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

/**
 * Refreshes the session on every request and gates protected routes.
 *
 * Two details matter here:
 *
 * 1. `supabase.auth.getUser()` — never `getSession()`. `getSession` reads
 *    the cookie and trusts it; `getUser` revalidates the token with the
 *    auth server. On the server, where the cookie is attacker-supplied,
 *    only the revalidated answer is worth anything.
 *
 * 2. The response object returned at the end must be the same one the
 *    Supabase client wrote its refreshed cookies onto. Constructing a
 *    fresh `NextResponse` after the call silently drops the rotated
 *    tokens and logs the user out roughly every hour.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;

  // Without credentials there is nothing to validate; let the setup screen
  // render rather than redirect-looping on /login.
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Carry the destination so sign-in returns you where you were headed.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
