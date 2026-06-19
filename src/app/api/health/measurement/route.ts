import { NextRequest, NextResponse } from "next/server";
import { recordMeasurement } from "@/lib/queries/health";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, studentId, heightCm, weightKg, recordedAt, recordedBy, remarks } = body;

  if (!schoolId || !studentId || !heightCm || !weightKg) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const record = await recordMeasurement({ schoolId, studentId, heightCm, weightKg, recordedAt, recordedBy, remarks });
    return NextResponse.json({ success: true, record });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
