import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { NAME_TO_DB_PROVIDER, type AiProviderName } from "@/lib/ai/provider";

const VALID_PROVIDERS: AiProviderName[] = ["anthropic", "openai", "gemini"];

/**
 * Per-school AI provider override, stored in `api_keys` (provider in
 * 'ai_anthropic' | 'ai_openai' | 'ai_gemini'). GET never returns the stored
 * key itself, only whether one is set, for which provider, and the model.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ configured: false });

  const { data: row } = await supabase
    .from("api_keys")
    .select("provider, config, secret_ciphertext, is_active")
    .eq("school_id", profile.school_id)
    .in("provider", Object.values(NAME_TO_DB_PROVIDER))
    .eq("is_active", true)
    .maybeSingle();

  if (!row?.secret_ciphertext) return NextResponse.json({ configured: false });

  const providerName = (Object.entries(NAME_TO_DB_PROVIDER).find(([, db]) => db === row.provider)?.[0] ?? null) as AiProviderName | null;

  return NextResponse.json({
    configured: true,
    provider: providerName,
    model: (row.config as { model?: string } | null)?.model ?? null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id, role").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ error: "No school associated with this user" }, { status: 400 });
  if (profile.role !== "school_admin" && profile.role !== "super_admin") {
    return NextResponse.json({ error: "เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่ตั้งค่า AI Provider ได้" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { provider, apiKey, model } = body as { provider?: string; apiKey?: string; model?: string };

  if (!provider || !VALID_PROVIDERS.includes(provider as AiProviderName)) {
    return NextResponse.json({ error: "provider ต้องเป็น anthropic | openai | gemini" }, { status: 400 });
  }
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({ error: "กรุณากรอก API key" }, { status: 400 });
  }

  const dbProvider = NAME_TO_DB_PROVIDER[provider as AiProviderName];

  // Deactivate any other provider override for this school so only one is active at a time.
  await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("school_id", profile.school_id)
    .in("provider", Object.values(NAME_TO_DB_PROVIDER))
    .neq("provider", dbProvider);

  const { error } = await supabase.from("api_keys").upsert(
    {
      school_id: profile.school_id,
      provider: dbProvider,
      config: model ? { model } : {},
      secret_ciphertext: apiKey.trim(),
      is_active: true,
      created_by: auth.user.id,
    },
    { onConflict: "school_id,provider" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void logAudit({ schoolId: profile.school_id, actorId: auth.user.id, action: "update", entityTable: "api_keys", metadata: { action: "ai_provider_set", provider } });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id, role").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ error: "No school associated with this user" }, { status: 400 });
  if (profile.role !== "school_admin" && profile.role !== "super_admin") {
    return NextResponse.json({ error: "เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่ตั้งค่า AI Provider ได้" }, { status: 403 });
  }

  await supabase.from("api_keys").delete().eq("school_id", profile.school_id).in("provider", Object.values(NAME_TO_DB_PROVIDER));

  void logAudit({ schoolId: profile.school_id, actorId: auth.user.id, action: "delete", entityTable: "api_keys", metadata: { action: "ai_provider_cleared" } });

  return NextResponse.json({ ok: true });
}
