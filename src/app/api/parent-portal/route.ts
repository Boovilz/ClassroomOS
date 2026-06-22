import { NextRequest, NextResponse } from "next/server";
import { getParentPortalOverview } from "@/lib/queries/communication";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parentUserId = searchParams.get("parentUserId");
  if (!parentUserId) {
    return NextResponse.json({ success: false, message: "Missing parentUserId" }, { status: 400 });
  }
  const overview = await getParentPortalOverview(parentUserId);
  return NextResponse.json({ success: true, ...overview });
}
