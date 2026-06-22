import { NextRequest, NextResponse } from "next/server";
import { getWelfareAnalytics } from "@/lib/queries/welfare";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) {
    return NextResponse.json({ success: false, message: "Missing schoolId" }, { status: 400 });
  }
  const analytics = await getWelfareAnalytics(schoolId);
  return NextResponse.json(analytics);
}
