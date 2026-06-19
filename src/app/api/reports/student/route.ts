import { NextRequest, NextResponse } from "next/server";
import { getStudentAcademicSummary, getAiAcademicAnalysis } from "@/lib/queries/academic";

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }
  const [summary, aiAnalysis] = await Promise.all([
    getStudentAcademicSummary(studentId),
    getAiAcademicAnalysis(studentId),
  ]);
  return NextResponse.json({ summary, aiAnalysis });
}
