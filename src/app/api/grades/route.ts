import { NextRequest, NextResponse } from "next/server";
import { getGradebook, recordScore } from "@/lib/queries/academic";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId");
  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }
  const gradebook = await getGradebook(subjectId);
  return NextResponse.json({ gradebook });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const score = await recordScore(body);
    return NextResponse.json({ score });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to record score" }, { status: 400 });
  }
}
