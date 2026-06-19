import { NextRequest, NextResponse } from "next/server";
import { recordHealthScreening } from "@/lib/queries/health";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, studentId, screeningType, result, screeningDate, findings, recommendation, nextScreeningDate, recordedBy } = body;

  if (!schoolId || !studentId || !screeningType || !result) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const record = await recordHealthScreening({
      schoolId,
      studentId,
      screeningType,
      result,
      screeningDate,
      findings,
      recommendation,
      nextScreeningDate,
      recordedBy,
    });
    return NextResponse.json({ success: true, record });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
