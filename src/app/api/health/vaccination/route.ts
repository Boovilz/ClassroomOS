import { NextRequest, NextResponse } from "next/server";
import { recordVaccination } from "@/lib/queries/health";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, studentId, vaccineName, doseNumber, administeredAt, nextDueAt, hospital, notes, recordedBy, status } = body;

  if (!schoolId || !studentId || !vaccineName) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const record = await recordVaccination({
      schoolId,
      studentId,
      vaccineName,
      doseNumber,
      administeredAt,
      nextDueAt,
      hospital,
      notes,
      recordedBy,
      status,
    });
    return NextResponse.json({ success: true, record });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
