import { NextRequest, NextResponse } from "next/server";
import { getIndividualHealthReport } from "@/lib/queries/health";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getIndividualHealthReport(id);
  return NextResponse.json(report);
}
