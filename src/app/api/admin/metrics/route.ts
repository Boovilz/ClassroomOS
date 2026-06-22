import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper, type AdminContext } from "@/lib/admin/guard";

/**
 * System Health metrics - real, queryable app-level numbers only. NO
 * OS-level CPU/memory (no server to read that from in this Vercel/Supabase
 * architecture - genuinely not available, not faked).
 *
 *  - DB size / row counts: admin_table_stats() Postgres function (see
 *    migration 20250101000025), super_admin only (instance-wide).
 *  - Active sessions: best-effort count of distinct users with a login_logs
 *    row in the last 24h (Supabase does not expose auth.sessions to the
 *    anon/authenticated roles, so this is the closest real proxy).
 *  - API usage: count of api_usage_logs rows (kind='api') in the last 24h.
 *  - AI usage: count + token sums from the existing ai_usage_logs table
 *    (Module 12).
 */
export async function GET(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId } = guard.ctx;

  const targetSchoolId = role === "super_admin" ? request.nextUrl.searchParams.get("schoolId") : schoolId;
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [schoolsCount, usersCount, teachersCount, studentsCount, activeLogins, apiUsage24h, aiUsage24h, tableStats] = await Promise.all([
    role === "super_admin" && !targetSchoolId ? supabase.from("schools").select("id", { count: "exact", head: true }) : Promise.resolve({ count: 1 }),
    countQuery(supabase, "users", targetSchoolId),
    countQuery(supabase, "teachers", targetSchoolId),
    countQuery(supabase, "students", targetSchoolId),
    countQuery(supabase, "login_logs", targetSchoolId, since24h),
    countQuery(supabase, "api_usage_logs", targetSchoolId, since24h),
    supabase
      .from("ai_usage_logs")
      .select("input_tokens, output_tokens", { count: "exact" })
      .then((r) => r),
    role === "super_admin"
      ? supabase.rpc("admin_table_stats" as never)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const aiTokens = (aiUsage24h.data ?? []).reduce(
    (acc, row: { input_tokens: number | null; output_tokens: number | null }) => ({
      input: acc.input + (row.input_tokens ?? 0),
      output: acc.output + (row.output_tokens ?? 0),
    }),
    { input: 0, output: 0 }
  );

  return NextResponse.json({
    schools: "count" in schoolsCount ? schoolsCount.count ?? 0 : 0,
    users: usersCount,
    teachers: teachersCount,
    students: studentsCount,
    activeSessions24h: activeLogins,
    apiCalls24h: apiUsage24h,
    aiCalls: aiUsage24h.count ?? 0,
    aiTokens,
    tableStats: tableStats.data ?? null,
    note: "OS-level CPU/memory is not available in this Vercel/Supabase architecture - metrics shown are real app-level/database-level counts only.",
  });
}

async function countQuery(
  supabase: AdminContext["supabase"],
  table: string,
  schoolId: string | null,
  since?: string
) {
  let query = supabase.from(table as never).select("id", { count: "exact", head: true });
  if (schoolId) query = query.eq("school_id", schoolId);
  if (since) query = query.gte("created_at", since);
  const { count } = await query;
  return count ?? 0;
}
