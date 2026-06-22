import { NextRequest, NextResponse } from "next/server";
import { getHomeVisitDetail, updateHomeVisit } from "@/lib/queries/welfare";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getHomeVisitDetail(id);
  return NextResponse.json(detail);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  try {
    const visit = await updateHomeVisit(id, body);
    return NextResponse.json({ success: true, visit });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
