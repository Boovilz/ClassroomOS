import { NextRequest, NextResponse } from "next/server";
import { issueStudentQrToken } from "@/lib/queries/attendance";

/** Issues a fresh signed QR token for a given student (used by /attendance/qr). */
export async function POST(request: NextRequest) {
  const { studentId } = await request.json();
  if (!studentId) {
    return NextResponse.json({ success: false, message: "Missing studentId" }, { status: 400 });
  }

  try {
    const { token, expiresAt } = await issueStudentQrToken(studentId);
    return NextResponse.json({ success: true, token, expiresAt });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
