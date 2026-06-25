import { NextRequest, NextResponse } from "next/server";
import { recordManualAttendance } from "@/lib/queries/attendance";

/** Teacher-entered retroactive check-in for a past date (no QR token needed). */
export async function POST(request: NextRequest) {
  const { dates, entries } = await request.json();

  if (!Array.isArray(dates) || dates.length === 0 || !Array.isArray(entries)) {
    return NextResponse.json({ success: false, message: "Missing dates or entries" }, { status: 400 });
  }

  const result = await recordManualAttendance(dates, entries);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
