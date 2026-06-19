import { NextResponse } from "next/server";
import { getDashboardHeaderInfo, getDashboardSummary, getSummaryCardsData } from "@/lib/queries/dashboard";

export async function GET() {
  const [header, summary, cards] = await Promise.all([
    getDashboardHeaderInfo(),
    getDashboardSummary(),
    getSummaryCardsData(),
  ]);

  return NextResponse.json({ header, summary, cards });
}
