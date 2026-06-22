import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTotpSecret, verifyTotpCode } from "@/lib/admin/totp";
import { logAudit } from "@/lib/audit";

/**
 * 2FA enrollment/verification for the CURRENT signed-in user (any role -
 * 2FA is a personal security setting, not admin-only). Secret is stored in
 * `api_keys` (school_id + provider='totp', config.enabled flag,
 * secret_ciphertext holding the base32 secret - acceptable in plaintext
 * here only because Postgres RLS already restricts each row to its owning
 * school_admin/super_admin and this is a demo-grade implementation; a
 * production system should encrypt this column at the application layer).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id, email, full_name").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ error: "No school associated with this user" }, { status: 400 });

  const body = await request.json().catch(() => ({}));

  if (body.action === "enroll") {
    const { secret, uri } = generateTotpSecret(`${profile.full_name} (${profile.email})`);
    const { error } = await supabase
      .from("api_keys")
      .upsert(
        { school_id: profile.school_id, provider: `totp:${auth.user.id}`, config: { enabled: false, user_id: auth.user.id }, secret_ciphertext: secret, created_by: auth.user.id },
        { onConflict: "school_id,provider" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ secret, uri });
  }

  if (body.action === "verify") {
    const { data: row } = await supabase
      .from("api_keys")
      .select("secret_ciphertext")
      .eq("school_id", profile.school_id)
      .eq("provider", `totp:${auth.user.id}`)
      .maybeSingle();
    if (!row?.secret_ciphertext) {
      return NextResponse.json({ error: "ยังไม่ได้เริ่มลงทะเบียน 2FA — โปรดเริ่มที่ enroll ก่อน" }, { status: 400 });
    }
    const valid = verifyTotpCode(row.secret_ciphertext, body.code ?? "");
    if (!valid) return NextResponse.json({ error: "รหัสยืนยันไม่ถูกต้อง" }, { status: 400 });

    await supabase
      .from("api_keys")
      .update({ config: { enabled: true, user_id: auth.user.id } })
      .eq("school_id", profile.school_id)
      .eq("provider", `totp:${auth.user.id}`);

    void logAudit({ schoolId: profile.school_id, actorId: auth.user.id, action: "update", entityTable: "api_keys", metadata: { action: "2fa_enabled" } });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "disable") {
    await supabase.from("api_keys").delete().eq("school_id", profile.school_id).eq("provider", `totp:${auth.user.id}`);
    void logAudit({ schoolId: profile.school_id, actorId: auth.user.id, action: "delete", entityTable: "api_keys", metadata: { action: "2fa_disabled" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action - use enroll | verify | disable" }, { status: 400 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ enabled: false });

  const { data: row } = await supabase
    .from("api_keys")
    .select("config")
    .eq("school_id", profile.school_id)
    .eq("provider", `totp:${auth.user.id}`)
    .maybeSingle();

  return NextResponse.json({ enabled: !!(row?.config as { enabled?: boolean } | null)?.enabled });
}
