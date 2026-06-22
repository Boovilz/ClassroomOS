import { NextRequest, NextResponse } from "next/server";
import { createStudentCase, getStudentCases } from "@/lib/queries/welfare";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ success: false, message: "Missing studentId" }, { status: 400 });
  }
  const cases = await getStudentCases(studentId);
  return NextResponse.json({ success: true, cases });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, studentId, title, concernType, description, openedBy, assignedTo } = body;

  if (!schoolId || !studentId || !title) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const studentCase = await createStudentCase({ schoolId, studentId, title, concernType, description, openedBy, assignedTo });
    return NextResponse.json({ success: true, case: studentCase });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
