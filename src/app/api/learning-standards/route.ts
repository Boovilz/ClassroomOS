import { NextRequest, NextResponse } from "next/server";
import { getLearningStandards, createLearningStandard } from "@/lib/queries/academic";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId") ?? undefined;
  const standards = await getLearningStandards(subjectId);
  return NextResponse.json({ standards });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const standard = await createLearningStandard(body);
    return NextResponse.json({ standard });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create learning standard" }, { status: 400 });
  }
}
