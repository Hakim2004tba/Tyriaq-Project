import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * The server client, for Server Components and Server Actions.
 *
 * Server Components cannot set cookies — only Server Actions, Route
 * Handlers and middleware can. The `setAll` below therefore swallows the
 * write when it is called from a component render; the middleware
 * refreshes the session on every request, so nothing is lost. Throwing
 * there instead would crash any page that merely reads the user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — see the note above.
        }
      },
    },
  });
}
