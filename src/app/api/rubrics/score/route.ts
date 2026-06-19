import { NextRequest, NextResponse } from "next/server";
import { scoreRubric } from "@/lib/queries/academic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const result = await scoreRubric(body);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to score rubric" }, { status: 400 });
  }
}
