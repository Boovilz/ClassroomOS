import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Workflow } from "@/lib/automation/types";

const CATEGORY = "automation_workflow";

async function getCtx(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return null;
  return { userId: auth.user.id, schoolId: profile.school_id };
}

// Find the settings row for a workflow_id
async function findRow(supabase: Awaited<ReturnType<typeof createClient>>, schoolId: string, workflowId: string) {
  const { data } = await supabase
    .from("system_settings")
    .select("id, settings")
    .eq("school_id", schoolId)
    .eq("category", CATEGORY);
  return (data ?? []).find(r => (r.settings as unknown as Workflow).workflow_id === workflowId) ?? null;
}

// PUT /api/automation/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const ctx = await getCtx(supabase);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await findRow(supabase, ctx.schoolId, id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const existing = row.settings as unknown as Workflow;
  const updated: Workflow = { ...existing, ...body, workflow_id: id };

  const { error } = await supabase
    .from("system_settings")
    .update({ settings: updated as unknown as Record<string, unknown>, updated_by: ctx.userId })
    .eq("id", row.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workflow: updated });
}

// DELETE /api/automation/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const ctx = await getCtx(supabase);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await findRow(supabase, ctx.schoolId, id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("system_settings").delete().eq("id", row.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
