import { NextRequest, NextResponse } from "next/server";
import { getGradebookWeights, setGradebookWeights } from "@/lib/queries/academic";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId");
  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }
  const weights = await getGradebookWeights(subjectId);
  return NextResponse.json({ weights });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const weights = await setGradebookWeights(body);
    return NextResponse.json({ weights });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save weights" }, { status: 400 });
  }
}
