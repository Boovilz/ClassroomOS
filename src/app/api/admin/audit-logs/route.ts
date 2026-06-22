import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdminOrSuper } from "@/lib/admin/guard";

/** Filterable audit-log query (by actor/action/entity_table/date range). Reuses the existing audit_logs table. */
export async function GET(request: NextRequest) {
  const guard = await requireSchoolAdminOrSuper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, role, schoolId } = guard.ctx;

  const sp = request.nextUrl.searchParams;
  const targetSchoolId = role === "super_admin" ? sp.get("schoolId") ?? schoolId : schoolId;

  let query = supabase
    .from("audit_logs")
    .select("*, users:actor_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (targetSchoolId) query = query.eq("school_id", targetSchoolId);
  const actorId = sp.get("actorId");
  if (actorId) query = query.eq("actor_id", actorId);
  const action = sp.get("action");
  if (action) query = query.eq("action", action);
  const entityTable = sp.get("entityTable");
  if (entityTable) query = query.eq("entity_table", entityTable);
  const from = sp.get("from");
  if (from) query = query.gte("created_at", from);
  const to = sp.get("to");
  if (to) query = query.lte("created_at", to);

  const { data: logs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs });
}
