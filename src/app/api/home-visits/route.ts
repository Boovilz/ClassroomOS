import { NextRequest, NextResponse } from "next/server";
import { getHomeVisitCalendar, scheduleHomeVisit } from "@/lib/queries/welfare";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!startDate || !endDate) {
    return NextResponse.json({ success: false, message: "Missing startDate/endDate" }, { status: 400 });
  }
  const visits = await getHomeVisitCalendar(startDate, endDate);
  return NextResponse.json({ visits });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, studentId, teacherId, visitDate, visitTime, visitType, purpose, createdBy } = body;

  if (!schoolId || !studentId || !visitDate) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const visit = await scheduleHomeVisit({ schoolId, studentId, teacherId, visitDate, visitTime, visitType, purpose, createdBy });
    return NextResponse.json({ success: true, visit });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
