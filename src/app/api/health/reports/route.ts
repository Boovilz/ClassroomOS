import { NextRequest, NextResponse } from "next/server";
import { getClassHealthReport, getIndividualHealthReport } from "@/lib/queries/health";

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (studentId) {
    const report = await getIndividualHealthReport(studentId);
    return NextResponse.json(report);
  }
  const report = await getClassHealthReport();
  return NextResponse.json({ report });
}
