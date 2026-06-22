import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Privileged server-only Supabase client using `SUPABASE_SERVICE_ROLE_KEY`
 * (bypasses RLS). NEVER import this from a client component or expose it
 * to the browser. Used only by /api/admin/* route handlers that need
 * `auth.admin` (create/suspend a user's auth account, reset password) -
 * operations the anon-key + RLS client cannot perform. `.env.example`
 * already anticipated this exact use case ("future admin scripts").
 *
 * Every call site using this client MUST do its own role check first (see
 * src/lib/admin/guard.ts) since RLS is bypassed entirely here.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not set - required for privileged admin operations.");
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isServiceRoleConfigured(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
