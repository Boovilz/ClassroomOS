import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";
import { logAudit } from "@/lib/audit";

/** Bulk suspend/activate/role-change for a set of user ids, mirroring the students module's bulk-ops pattern. */
export async function POST(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId, userId } = guard.ctx;

  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  const action: string = body?.action;
  if (ids.length === 0 || !["suspend", "activate", "set_role", "delete"].includes(action)) {
    return NextResponse.json({ error: "ต้องระบุ ids และ action (suspend|activate|set_role|delete)" }, { status: 400 });
  }

  let query = supabase.from("users").update(buildUpdate(action, body) as never).in("id", ids).select("id, school_id");
  if (role !== "super_admin" && schoolId) {
    query = query.eq("school_id", schoolId); // school_admin cannot touch other schools' users even if ids leak in
  }
  const { data: updated, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const u of updated ?? []) {
    void logAudit({
      schoolId: u.school_id ?? schoolId ?? "",
      actorId: userId,
      action: action === "delete" ? "delete" : "update",
      entityTable: "users",
      entityId: u.id,
      metadata: { source: "admin_console_bulk", action },
    });
  }

  return NextResponse.json({ updatedCount: updated?.length ?? 0 });
}

function buildUpdate(action: string, body: Record<string, unknown>): Record<string, unknown> {
  switch (action) {
    case "suspend":
      return { is_active: false };
    case "activate":
      return { is_active: true };
    case "delete":
      return { is_active: false, deleted_at: new Date().toISOString() };
    case "set_role":
      return { role: body.role };
    default:
      return {};
  }
}
