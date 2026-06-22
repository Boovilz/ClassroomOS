import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

/** User Management list (scoped to caller's school unless super_admin + ?schoolId=). */
export async function GET(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId } = guard.ctx;

  const targetSchoolId = role === "super_admin" ? request.nextUrl.searchParams.get("schoolId") ?? schoolId : schoolId;

  let query = supabase.from("users").select("*").order("full_name");
  if (targetSchoolId) query = query.eq("school_id", targetSchoolId);
  const { data: users, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users });
}

/** Create a new user: real auth.users account (service role) + app-level `users` row. */
export async function POST(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { role, schoolId, userId } = guard.ctx;

  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.full_name || !body?.role) {
    return NextResponse.json({ error: "ต้องระบุ email, full_name, role" }, { status: 400 });
  }

  const targetSchoolId = role === "super_admin" ? body.school_id ?? schoolId : schoolId;
  if (!targetSchoolId) {
    return NextResponse.json({ error: "ต้องระบุโรงเรียน (school_id)" }, { status: 400 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY — ไม่สามารถสร้างผู้ใช้ใหม่ได้ในขณะนี้" },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const tempPassword = body.password ?? crypto.randomUUID().slice(0, 12);

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: body.email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authError || !created.user) {
    return NextResponse.json({ error: authError?.message ?? "สร้างบัญชีผู้ใช้ไม่สำเร็จ" }, { status: 500 });
  }

  const { data: appUser, error: profileError } = await admin
    .from("users")
    .insert({
      id: created.user.id,
      email: body.email,
      full_name: body.full_name,
      role: body.role,
      school_id: targetSchoolId,
      phone: body.phone ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id); // rollback the auth account so we don't leak orphaned accounts
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  void logAudit({
    schoolId: targetSchoolId,
    actorId: userId,
    action: "create",
    entityTable: "users",
    entityId: appUser.id,
    metadata: { source: "admin_console", role: body.role },
  });

  return NextResponse.json({ user: appUser, tempPassword: body.password ? undefined : tempPassword }, { status: 201 });
}
