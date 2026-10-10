import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient<any, any, any> | null = null;

export function supabaseAdmin(): SupabaseClient<any, any, any> {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis (voir .env.local.example)."
    );
  }
  client = createClient<any, any, any>(url, key, { auth: { persistSession: false } });
  return client;
}
