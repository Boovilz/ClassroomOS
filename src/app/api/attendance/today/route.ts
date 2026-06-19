import { NextResponse } from "next/server";
import { getTodayAttendanceSummary } from "@/lib/queries/attendance";

export async function GET() {
  const summary = await getTodayAttendanceSummary();
  return NextResponse.json(summary);
}
