import { NextRequest, NextResponse } from "next/server";
import { overrideAttendance, bulkOverrideAttendance } from "@/lib/queries/attendance";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, ids, ...changes } = body ?? {};

  if (Array.isArray(ids) && ids.length > 0) {
    const result = await bulkOverrideAttendance(ids, changes);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }

  if (!id) {
    return NextResponse.json({ success: false, message: "Missing id or ids" }, { status: 400 });
  }

  const result = await overrideAttendance(id, changes);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
