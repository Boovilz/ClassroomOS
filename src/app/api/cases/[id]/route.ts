import { NextRequest, NextResponse } from "next/server";
import { updateStudentCase } from "@/lib/queries/welfare";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  try {
    const studentCase = await updateStudentCase(id, body);
    return NextResponse.json({ success: true, case: studentCase });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
