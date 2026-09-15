import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * A client that bypasses every row policy.
 *
 * Exactly one thing needs this: the nightly digest, which has to read
 * unread notifications for EVERY person in order to mail them, and
 * therefore cannot act as any one of them.
 *
 * Three guards, because the cost of this key leaking is every row in the
 * database:
 *
 *   · `server-only` at the top of the file, so importing it from a
 *     client component fails the build rather than shipping the key;
 *   · the variable has no NEXT_PUBLIC_ prefix, so Next will not inline
 *     it into the browser bundle even by accident;
 *   · it is read lazily, so a deployment without the key runs fine and
 *     only the digest reports itself unavailable.
 *
 * Never use this to answer a request on a person's behalf. If a caller
 * has a session, the ordinary client is the right one, and going around
 * the policies is how a bug becomes a data leak instead of an error.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return null;

  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
