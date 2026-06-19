import { NextResponse } from "next/server";
import { getAttendanceModeAnalytics } from "@/lib/queries/attendance";
import { getAttendanceAnalytics } from "@/lib/queries/dashboard";

export async function GET() {
  const [analytics, modeBreakdown] = await Promise.all([getAttendanceAnalytics(), getAttendanceModeAnalytics()]);
  return NextResponse.json({ ...analytics, modeBreakdown });
}
