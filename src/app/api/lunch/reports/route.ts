import { NextRequest, NextResponse } from "next/server";
import { getMealReport } from "@/lib/queries/lunch";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!schoolId || !startDate || !endDate) {
    return NextResponse.json({ message: "Missing schoolId/startDate/endDate" }, { status: 400 });
  }

  const rows = await getMealReport(schoolId, startDate, endDate);
  return NextResponse.json({ rows });
}
