import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId } = guard.ctx;

  const targetSchoolId = role === "super_admin" ? request.nextUrl.searchParams.get("schoolId") ?? schoolId : schoolId;
  if (!targetSchoolId) return NextResponse.json({ error: "No school in context" }, { status: 400 });

  const { data, error } = await supabase.from("theme_settings").select("*").eq("school_id", targetSchoolId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ theme: data ?? null });
}

export async function PUT(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId, userId } = guard.ctx;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const targetSchoolId = role === "super_admin" ? body.schoolId ?? schoolId : schoolId;
  if (!targetSchoolId) return NextResponse.json({ error: "No school in context" }, { status: 400 });

  const update: Record<string, unknown> = { school_id: targetSchoolId };
  for (const key of ["primary_color", "secondary_color", "logo_url", "favicon_url", "login_background_url"] as const) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await supabase.from("theme_settings").upsert(update as never, { onConflict: "school_id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void logAudit({ schoolId: targetSchoolId, actorId: userId, action: "update", entityTable: "theme_settings", entityId: data.id });

  return NextResponse.json({ theme: data });
}
