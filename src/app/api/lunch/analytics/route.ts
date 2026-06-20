import { NextRequest, NextResponse } from "next/server";
import { getLunchAnalytics } from "@/lib/queries/lunch";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) {
    return NextResponse.json({ message: "Missing schoolId" }, { status: 400 });
  }
  const analytics = await getLunchAnalytics(schoolId);
  return NextResponse.json(analytics);
}
