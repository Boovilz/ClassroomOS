import { NextRequest, NextResponse } from "next/server";
import { getStudentRiskProfile } from "@/lib/queries/sdq";

// Risk Profile System: reuses Module 9's getAiRiskScore() composite risk
// engine (welfare.ts), extended here to also weight in the latest SDQ
// total-difficulties score. No second risk system / stored profile table.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getStudentRiskProfile(studentId);
  return NextResponse.json({ profile });
}
