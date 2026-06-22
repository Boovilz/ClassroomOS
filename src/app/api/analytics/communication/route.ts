import { NextRequest, NextResponse } from "next/server";
import { getCommunicationAnalytics } from "@/lib/queries/communication";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) {
    return NextResponse.json({ success: false, message: "Missing schoolId" }, { status: 400 });
  }
  const analytics = await getCommunicationAnalytics(schoolId);
  return NextResponse.json({ success: true, analytics });
}
