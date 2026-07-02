import { NextRequest, NextResponse } from "next/server";
import { listSupervisionRecords, createSupervisionRecord } from "@/lib/queries/supervision";

export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("schoolId");
  if (!schoolId) {
    return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
  }
  try {
    const records = await listSupervisionRecords(schoolId);
    return NextResponse.json({ records });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const record = await createSupervisionRecord(body);
    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
