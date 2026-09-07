import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges the code from a Supabase email link for a session.
 *
 * Confirmation and password-recovery links both land here. The exchange
 * must happen in a Route Handler, not a page, because it needs to SET the
 * session cookie and Server Components cannot write cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Only same-origin paths — an open redirect here would let a crafted
  // link bounce a freshly authenticated user to somewhere hostile.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
  }

  const failed = new URL("/login", origin);
  failed.searchParams.set("error", "That link is invalid or has expired.");
  return NextResponse.redirect(failed);
}
