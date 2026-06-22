import { NextRequest, NextResponse } from "next/server";
import { getHouseholdProfile, upsertHouseholdProfile, runPovertyScreening } from "@/lib/queries/welfare";

export async function GET(request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getHouseholdProfile(studentId);
  return NextResponse.json({ success: true, ...data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const body = await request.json();
  const { schoolId, ...rest } = body;

  if (!schoolId) {
    return NextResponse.json({ success: false, message: "Missing schoolId" }, { status: 400 });
  }

  try {
    const profile = await upsertHouseholdProfile({ schoolId, studentId, ...rest });
    return NextResponse.json({ success: true, profile });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  try {
    const result = await runPovertyScreening(studentId);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
