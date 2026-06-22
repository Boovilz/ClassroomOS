import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";

/** Login monitoring list for the Security page. */
export async function GET(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId } = guard.ctx;

  const targetSchoolId = role === "super_admin" ? request.nextUrl.searchParams.get("schoolId") ?? schoolId : schoolId;

  let query = supabase
    .from("login_logs")
    .select("*, users:user_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (targetSchoolId) query = query.eq("school_id", targetSchoolId);

  const { data: logs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs });
}
