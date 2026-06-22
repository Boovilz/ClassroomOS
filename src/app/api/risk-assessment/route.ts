import { NextRequest, NextResponse } from "next/server";
import { getAiRiskScore } from "@/lib/queries/welfare";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId } = body;
  if (!studentId) {
    return NextResponse.json({ success: false, message: "Missing studentId" }, { status: 400 });
  }
  try {
    const result = await getAiRiskScore(studentId);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
