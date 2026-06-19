import { NextRequest, NextResponse } from "next/server";
import { getAssignments, createAssignment } from "@/lib/queries/academic";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId") ?? undefined;
  const assignments = await getAssignments(subjectId);
  return NextResponse.json({ assignments });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const assignment = await createAssignment(body);
    return NextResponse.json({ assignment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create assignment" }, { status: 400 });
  }
}
