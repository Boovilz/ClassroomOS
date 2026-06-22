import { NextRequest, NextResponse } from "next/server";
import { runAiWorkflow, currentUserContext, type WorkflowKind } from "@/lib/queries/ai";

/**
 * POST /api/ai/workflows - manually-triggered "run now" workflow.
 * NOT a real scheduler/cron - see migration header + final report for the
 * documented limitation (no background job runner in this Next.js app).
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { kind } = body as { kind?: WorkflowKind };
  if (!kind) return NextResponse.json({ success: false, message: "Missing kind" }, { status: 400 });

  const { schoolId, userId } = await currentUserContext();
  if (!schoolId) return NextResponse.json({ success: false, message: "Unauthorized or no school" }, { status: 401 });

  try {
    const result = await runAiWorkflow(kind, schoolId, userId ?? undefined);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
