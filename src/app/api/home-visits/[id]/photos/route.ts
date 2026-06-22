import { NextRequest, NextResponse } from "next/server";
import { addHomeVisitPhoto } from "@/lib/queries/welfare";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { schoolId, photoUrl, category, caption, uploadedBy } = body;

  if (!schoolId || !photoUrl) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const photo = await addHomeVisitPhoto({ schoolId, homeVisitId: id, photoUrl, category, caption, uploadedBy });
    return NextResponse.json({ success: true, photo });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
