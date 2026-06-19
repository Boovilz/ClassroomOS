import { NextRequest, NextResponse } from "next/server";
import { getRubrics, createRubric } from "@/lib/queries/academic";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId") ?? undefined;
  const rubrics = await getRubrics(subjectId);
  return NextResponse.json({ rubrics });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const rubric = await createRubric(body);
    return NextResponse.json({ rubric });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create rubric" }, { status: 400 });
  }
}
