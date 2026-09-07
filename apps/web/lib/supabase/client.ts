"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * The browser client.
 *
 * Reads and writes the session as cookies (not localStorage) so the same
 * session is visible to Server Components, Server Actions and middleware.
 * A token that only exists in localStorage cannot be seen by the server,
 * which is what makes protected server rendering impossible.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
