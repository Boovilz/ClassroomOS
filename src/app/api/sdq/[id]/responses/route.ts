import { NextRequest, NextResponse } from "next/server";
import { saveSdqResponse } from "@/lib/queries/sdq";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { schoolId, questionId, answerValue } = body;

  if (!schoolId || !questionId || answerValue === undefined) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    await saveSdqResponse({ schoolId, assessmentId: id, questionId, answerValue });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
