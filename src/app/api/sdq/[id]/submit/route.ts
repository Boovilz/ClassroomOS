import { NextRequest, NextResponse } from "next/server";
import { submitSdqAssessment } from "@/lib/queries/sdq";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const breakdown = await submitSdqAssessment(id);
    return NextResponse.json({ success: true, breakdown });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
