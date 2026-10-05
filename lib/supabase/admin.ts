import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client using the service role key, which bypasses Row Level Security.
// Never import this file from a Client Component or expose this key to the browser.
let client: SupabaseClient | undefined;
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Add SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) to .env.local, then restart the app.");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
