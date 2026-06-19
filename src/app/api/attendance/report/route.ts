import { NextRequest, NextResponse } from "next/server";
import { getAttendanceReport } from "@/lib/queries/attendance";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  const report = await getAttendanceReport({ from, to });
  return NextResponse.json({ from, to, report });
}
