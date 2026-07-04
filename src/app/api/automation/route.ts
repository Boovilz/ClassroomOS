import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Workflow } from "@/lib/automation/types";


const CATEGORY = "automation_workflow";

async function getSchoolAndUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return null;
  return { userId: auth.user.id, schoolId: profile.school_id };
}

// GET /api/automation
export async function GET() {
  const supabase = await createClient();
  const ctx = await getSchoolAndUser(supabase);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("system_settings")
    .select("id, settings, created_at, updated_at")
    .eq("school_id", ctx.schoolId)
    .eq("category", CATEGORY)
    .order("created_at", { ascending: false });

  const workflows: Workflow[] = (data ?? []).map(r => r.settings as unknown as Workflow);
  return NextResponse.json({ workflows });
}

// POST /api/automation
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const ctx = await getSchoolAndUser(supabase);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Install template
  if (body.template) {
    const wf: Workflow = {
      ...body.template,
      workflow_id: crypto.randomUUID(),
      run_count: 0,
      last_run_at: null,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("system_settings").insert({
      school_id: ctx.schoolId,
      category: CATEGORY,
      settings: wf as unknown as Record<string, unknown>,
      updated_by: ctx.userId,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ workflow: data.settings }, { status: 201 });
  }

  const { name, description, trigger, conditions, actions, enabled } = body;
  if (!name || !trigger) return NextResponse.json({ error: "name and trigger required" }, { status: 400 });

  const wf: Workflow = {
    workflow_id: crypto.randomUUID(),
    name,
    description: description ?? "",
    trigger,
    conditions: conditions ?? [],
    actions: actions ?? [],
    enabled: enabled ?? true,
    run_count: 0,
    last_run_at: null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("system_settings").insert({
    school_id: ctx.schoolId,
    category: CATEGORY,
    settings: wf as unknown as Record<string, unknown>,
    updated_by: ctx.userId,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workflow: data.settings }, { status: 201 });
}
