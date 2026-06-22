import { NextRequest, NextResponse } from "next/server";
import { getIndividualHomeVisitReport } from "@/lib/queries/welfare";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const visitId = searchParams.get("visitId");
  if (!visitId) {
    return NextResponse.json({ success: false, message: "Missing visitId" }, { status: 400 });
  }
  const report = await getIndividualHomeVisitReport(visitId);
  return NextResponse.json(report);
}
