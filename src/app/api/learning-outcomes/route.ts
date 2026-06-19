import { NextRequest, NextResponse } from "next/server";
import { getLearningOutcomes, recordLearningOutcome } from "@/lib/queries/academic";

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }
  const outcomes = await getLearningOutcomes(studentId);
  return NextResponse.json({ outcomes });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const outcome = await recordLearningOutcome(body);
    return NextResponse.json({ outcome });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to record learning outcome" }, { status: 400 });
  }
}
