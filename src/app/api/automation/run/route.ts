import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Workflow, ExecutionLog } from "@/lib/automation/types";
import { runWorkflow } from "@/lib/automation/engine";


const WF_CATEGORY  = "automation_workflow";
const LOG_CATEGORY = "automation_log";

// POST /api/automation/run  { workflow_id, trigger_data? }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ error: "No school" }, { status: 400 });

  const body = await request.json();
  const { workflow_id, trigger_data = {} } = body;

  // Load workflow
  const { data: rows } = await supabase
    .from("system_settings")
    .select("id, settings")
    .eq("school_id", profile.school_id)
    .eq("category", WF_CATEGORY);

  const row = (rows ?? []).find(r => (r.settings as unknown as Workflow).workflow_id === workflow_id);
  if (!row) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const workflow = row.settings as unknown as Workflow;
  if (!workflow.enabled) return NextResponse.json({ error: "Workflow is disabled" }, { status: 400 });

  // Execute
  const logData = await runWorkflow(workflow, trigger_data, profile.school_id, auth.user.id);
  const log: ExecutionLog = { log_id: crypto.randomUUID(), ...logData };

  // Save log
  await supabase.from("system_settings").insert({
    school_id: profile.school_id,
    category: LOG_CATEGORY,
    settings: log as unknown as Record<string, unknown>,
    updated_by: auth.user.id,
  });

  // Update workflow run count + last_run_at
  const updated: Workflow = {
    ...workflow,
    run_count: (workflow.run_count ?? 0) + 1,
    last_run_at: new Date().toISOString(),
  };
  await supabase.from("system_settings")
    .update({ settings: updated as unknown as Record<string, unknown> })
    .eq("id", row.id);

  return NextResponse.json({ log });
}
