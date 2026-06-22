import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

/** Edit / suspend / activate / reset-password for a single user. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId, userId } = guard.ctx;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  // school_admin can only touch users in their own school.
  if (role !== "super_admin") {
    const { data: target } = await supabase.from("users").select("school_id").eq("id", id).single();
    if (!target || target.school_id !== schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const update: Record<string, unknown> = {};
  for (const key of ["full_name", "role", "phone"] as const) {
    if (key in body) update[key] = body[key];
  }
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (body.suspend === true) {
    update.is_active = false;
    update.deleted_at = new Date().toISOString();
  }
  if (body.suspend === false) {
    update.is_active = true;
    update.deleted_at = null;
  }

  let resetPasswordResult: { tempPassword?: string; error?: string } | undefined;
  if (body.resetPassword === true) {
    if (!isServiceRoleConfigured()) {
      resetPasswordResult = { error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY — ไม่สามารถรีเซ็ตรหัสผ่านได้ในขณะนี้" };
    } else {
      const admin = createAdminClient();
      const tempPassword = crypto.randomUUID().slice(0, 12);
      const { error: pwError } = await admin.auth.admin.updateUserById(id, { password: tempPassword });
      resetPasswordResult = pwError ? { error: pwError.message } : { tempPassword };
    }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("users").update(update as never).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void logAudit({
    schoolId: schoolId ?? "",
    actorId: userId,
    action: body.suspend === true ? "delete" : body.suspend === false ? "restore" : "update",
    entityTable: "users",
    entityId: id,
    metadata: { source: "admin_console", changes: body },
  });

  const { data: updatedUser } = await supabase.from("users").select("*").eq("id", id).single();
  return NextResponse.json({ user: updatedUser, resetPassword: resetPasswordResult });
}
