import { NextRequest, NextResponse } from "next/server";
import { getSdqAssessmentWithResponses } from "@/lib/queries/sdq";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { assessment, questions, answers } = await getSdqAssessmentWithResponses(id);
  return NextResponse.json({ assessment, questions, answers: Object.fromEntries(answers) });
}
