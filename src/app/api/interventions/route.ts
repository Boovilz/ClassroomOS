import { NextRequest, NextResponse } from "next/server";
import { createInterventionPlan, getStudentInterventionPlans } from "@/lib/queries/welfare";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ success: false, message: "Missing studentId" }, { status: 400 });
  }
  const plans = await getStudentInterventionPlans(studentId);
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, studentId, caseId, planType, title, description, responsibleStaff, targetCompletionDate, createdBy } = body;

  if (!schoolId || !studentId || !title) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const plan = await createInterventionPlan({
      schoolId,
      studentId,
      caseId,
      planType,
      title,
      description,
      responsibleStaff,
      targetCompletionDate,
      createdBy,
    });
    return NextResponse.json({ success: true, plan });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
