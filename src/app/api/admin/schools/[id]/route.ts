import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper, requireSuperAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/audit";

/** Read a single school + quota - school_admin can read their OWN school (Subscription tab usage bars), super_admin can read any. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId } = guard.ctx;

  if (role !== "super_admin" && id !== schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: school, error } = await supabase.from("schools").select("*, school_quotas(*)").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ school });
}

/** Edit / suspend (soft-delete) / change plan+quota for a single school. super_admin only. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, userId } = guard.ctx;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const schoolUpdate: Record<string, unknown> = {};
  for (const key of ["name", "name_en", "address", "province", "phone", "plan"] as const) {
    if (key in body) schoolUpdate[key] = body[key];
  }
  if (body.suspend === true) schoolUpdate.deleted_at = new Date().toISOString();
  if (body.suspend === false) schoolUpdate.deleted_at = null;

  if (Object.keys(schoolUpdate).length > 0) {
    const { error } = await supabase.from("schools").update(schoolUpdate as never).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.quota) {
    const quotaUpdate: Record<string, unknown> = {};
    for (const key of ["max_students", "max_teachers", "max_storage_mb", "ai_credits_per_month"] as const) {
      if (key in body.quota) quotaUpdate[key] = body.quota[key];
    }
    const { error: quotaError } = await supabase
      .from("school_quotas")
      .upsert({ school_id: id, ...quotaUpdate });
    if (quotaError) return NextResponse.json({ error: quotaError.message }, { status: 500 });
  }

  void logAudit({
    schoolId: id,
    actorId: userId,
    action: "update",
    entityTable: "schools",
    entityId: id,
    metadata: { source: "admin_console", changes: body },
  });

  const { data: school } = await supabase.from("schools").select("*, school_quotas(*)").eq("id", id).single();
  return NextResponse.json({ school });
}
