import { NextRequest, NextResponse } from "next/server";
import { logParentCommunication, getParentCommunications } from "@/lib/queries/welfare";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ success: false, message: "Missing studentId" }, { status: 400 });
  }
  const communications = await getParentCommunications(studentId);
  return NextResponse.json({ success: true, communications });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, studentId, caseId, homeVisitId, communicationType, summary, agreements, followUpAction, followUpDate, communicatedBy } = body;

  if (!schoolId || !studentId || !summary) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const communication = await logParentCommunication({
      schoolId,
      studentId,
      caseId,
      homeVisitId,
      communicationType,
      summary,
      agreements,
      followUpAction,
      followUpDate,
      communicatedBy,
    });
    return NextResponse.json({ success: true, communication });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
