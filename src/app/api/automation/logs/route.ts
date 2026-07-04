import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ExecutionLog } from "@/lib/automation/types";

const LOG_CATEGORY = "automation_log";

// GET /api/automation/logs?workflow_id=&limit=20
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const workflowId = sp.get("workflow_id") ?? "";
  const limit = Math.min(Number(sp.get("limit") ?? "50"), 100);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ logs: [] });

  const { data } = await supabase
    .from("system_settings")
    .select("settings, created_at")
    .eq("school_id", profile.school_id)
    .eq("category", LOG_CATEGORY)
    .order("created_at", { ascending: false })
    .limit(limit);

  let logs: ExecutionLog[] = (data ?? []).map(r => r.settings as unknown as ExecutionLog);
  if (workflowId) logs = logs.filter(l => l.workflow_id === workflowId);

  return NextResponse.json({ logs });
}
