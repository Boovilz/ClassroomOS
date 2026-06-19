import { NextRequest, NextResponse } from "next/server";
import { recordCheckin } from "@/lib/queries/attendance";
import type { AttendanceMode } from "@/lib/supabase/types";

/** Verifies a scanned QR token and writes the attendance/log/notification rows. */
export async function POST(request: NextRequest) {
  const { token, mode, deviceInfo } = await request.json();
  if (!token) {
    return NextResponse.json({ success: false, message: "Missing token" }, { status: 400 });
  }

  const result = await recordCheckin(token, (mode as AttendanceMode) ?? "classroom", deviceInfo);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
