import { NextRequest, NextResponse } from "next/server";
import { getSupervisionRecord, updateSupervisionRecord } from "@/lib/queries/supervision";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const record = await getSupervisionRecord(id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ record });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const record = await updateSupervisionRecord(id, body);
    return NextResponse.json({ success: true, record });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
