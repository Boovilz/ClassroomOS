import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * First-run super_admin bootstrap. GET reports whether the claim is still
 * available (no super_admin exists yet); POST calls the security-definer
 * `claim_super_admin()` RPC (migration 0026), which re-checks the same
 * condition server-side before promoting the caller - this route is just a
 * thin wrapper, the RLS-safe guarantee lives in the database function.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "super_admin");
  return NextResponse.json({ available: (count ?? 0) === 0 });
}

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.rpc("claim_super_admin");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
