/**
 * Supabase environment.
 *
 * Both values are public by design — the anon key is safe in a browser
 * because Row Level Security, not key secrecy, protects the data. The
 * service-role key must never appear here or anywhere under `app/`.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * The values shipped in `.env.example`.
 *
 * Copying that file and forgetting to fill it in is the single most likely
 * setup mistake, and it is worse than leaving the variables unset: the app
 * would consider itself configured and fail on every request with a DNS
 * error instead of showing the setup instructions.
 */
const PLACEHOLDERS = new Set([
  "https://YOUR-PROJECT.supabase.co",
  "your-anon-key",
]);

export const isSupabaseConfigured =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) &&
  !PLACEHOLDERS.has(SUPABASE_URL) &&
  !PLACEHOLDERS.has(SUPABASE_ANON_KEY) &&
  SUPABASE_URL.startsWith("http");
