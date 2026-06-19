import { NextRequest, NextResponse } from "next/server";
import { submitAssignment } from "@/lib/queries/academic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const submission = await submitAssignment(body);
    return NextResponse.json({ submission });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to submit assignment" }, { status: 400 });
  }
}
