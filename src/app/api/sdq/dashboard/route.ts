import { NextResponse } from "next/server";
import { getSdqDashboard, getCurrentSchoolId } from "@/lib/queries/sdq";

export async function GET() {
  const schoolId = await getCurrentSchoolId();
  if (!schoolId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const dashboard = await getSdqDashboard(schoolId);
  return NextResponse.json({ dashboard });
}
