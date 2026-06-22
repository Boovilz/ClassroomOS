import { NextRequest, NextResponse } from "next/server";
import { scheduleSdqFollowUp } from "@/lib/queries/sdq";

// Wires the "schedule follow-up" affordance into Module 9's case management
// (student_cases), reusing the existing system instead of a new table.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { schoolId, studentId, title, description, assignedTo, openedBy } = body;

  if (!schoolId || !studentId || !title) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const studentCase = await scheduleSdqFollowUp({ schoolId, assessmentId: id, studentId, title, description, assignedTo, openedBy });
    return NextResponse.json({ success: true, case: studentCase });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
