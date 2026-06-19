import { NextRequest, NextResponse } from "next/server";
import { getSubjects, createSubject } from "@/lib/queries/academic";

export async function GET() {
  const subjects = await getSubjects();
  return NextResponse.json({ subjects });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const subject = await createSubject(body);
    return NextResponse.json({ subject });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create subject" }, { status: 400 });
  }
}
