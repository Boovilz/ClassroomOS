import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";
import { logAudit } from "@/lib/audit";

const VALID_CATEGORIES = [
  "academic",
  "attendance",
  "behavior",
  "finance",
  "health",
  "sdq",
  "communication",
  "ai",
  "theme",
  "qr",
  "document",
  "security",
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Unknown settings category" }, { status: 400 });
  }
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId } = guard.ctx;

  const targetSchoolId = role === "super_admin" ? request.nextUrl.searchParams.get("schoolId") ?? schoolId : schoolId;
  if (!targetSchoolId) return NextResponse.json({ error: "No school in context" }, { status: 400 });

  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("school_id", targetSchoolId)
    .eq("category", category)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settings: data?.settings ?? {}, updatedAt: data?.updated_at ?? null });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Unknown settings category" }, { status: 400 });
  }
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId, userId } = guard.ctx;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.settings !== "object") {
    return NextResponse.json({ error: "ต้องระบุ settings (object)" }, { status: 400 });
  }

  const targetSchoolId = role === "super_admin" ? body.schoolId ?? schoolId : schoolId;
  if (!targetSchoolId) return NextResponse.json({ error: "No school in context" }, { status: 400 });

  const { data, error } = await supabase
    .from("system_settings")
    .upsert(
      { school_id: targetSchoolId, category, settings: body.settings, updated_by: userId },
      { onConflict: "school_id,category" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void logAudit({
    schoolId: targetSchoolId,
    actorId: userId,
    action: "update",
    entityTable: "system_settings",
    entityId: data.id,
    metadata: { category },
  });

  return NextResponse.json({ settings: data.settings, updatedAt: data.updated_at });
}
