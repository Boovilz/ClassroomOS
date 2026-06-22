import { NextResponse } from "next/server";
import { getSdqClassroomComparison, getCurrentSchoolId } from "@/lib/queries/sdq";

export async function GET() {
  const schoolId = await getCurrentSchoolId();
  if (!schoolId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const classroomComparison = await getSdqClassroomComparison(schoolId);
  return NextResponse.json({ classroomComparison });
}
