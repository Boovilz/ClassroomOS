import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";
import { ALL_PERMISSION_KEYS, ASSIGNABLE_ROLES } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";

/**
 * Role & Permission Matrix data. Returns every (role x permission) cell as
 * allowed/denied. Rows in `role_permissions` are an UI-editable OVERLAY on
 * top of the hardcoded rbac.ts defaults - if no row exists for a
 * (school, role, permission) triple, the hardcoded `can()` result is used
 * as the default so the matrix is never empty on first load.
 */
export async function GET(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId } = guard.ctx;

  const targetSchoolId = role === "super_admin" ? request.nextUrl.searchParams.get("schoolId") ?? schoolId : schoolId;

  const { data: overrides, error } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("school_id", targetSchoolId ?? "");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    roles: ASSIGNABLE_ROLES,
    permissions: ALL_PERMISSION_KEYS,
    overrides: overrides ?? [],
  });
}

/** Upsert one matrix cell (role, permission_key, allowed). */
export async function PUT(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId, userId } = guard.ctx;

  const body = await request.json().catch(() => null);
  if (!body?.role || !body?.permissionKey || typeof body.allowed !== "boolean") {
    return NextResponse.json({ error: "ต้องระบุ role, permissionKey, allowed" }, { status: 400 });
  }

  const targetSchoolId = role === "super_admin" ? body.schoolId ?? schoolId : schoolId;
  if (!targetSchoolId) return NextResponse.json({ error: "No school in context" }, { status: 400 });

  const { data, error } = await supabase
    .from("role_permissions")
    .upsert(
      { school_id: targetSchoolId, role: body.role, permission_key: body.permissionKey, allowed: body.allowed },
      { onConflict: "school_id,role,permission_key" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void logAudit({ schoolId: targetSchoolId, actorId: userId, action: "update", entityTable: "role_permissions", entityId: data.id, metadata: body });

  return NextResponse.json({ override: data });
}
