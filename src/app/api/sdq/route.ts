import { NextRequest, NextResponse } from "next/server";
import { createSdqAssessment, getSdqAssessments, type SdqAssessmentStatus } from "@/lib/queries/sdq";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") ?? undefined;
  const status = (searchParams.get("status") ?? undefined) as SdqAssessmentStatus | undefined;
  const assessments = await getSdqAssessments({ studentId, status });
  return NextResponse.json({ assessments });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, studentId, assessmentType, assessmentPeriod, assignedToUserId, assignedToParentId, createdBy } = body;

  if (!schoolId || !studentId || !assessmentType) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const assessment = await createSdqAssessment({
      schoolId,
      studentId,
      assessmentType,
      assessmentPeriod,
      assignedToUserId,
      assignedToParentId,
      createdBy,
    });
    return NextResponse.json({ success: true, assessment });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
