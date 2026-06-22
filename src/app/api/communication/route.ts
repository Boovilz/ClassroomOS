import { NextRequest, NextResponse } from "next/server";
import { getCommunicationDashboard } from "@/lib/queries/communication";

/**
 * GET /api/communication - overall communication dashboard stats
 * (parents connected, LINE subscribers (simulated), unread messages,
 * announcements sent today, notification counts, engagement rate).
 */
export async function GET(_request: NextRequest) {
  const dashboard = await getCommunicationDashboard();
  return NextResponse.json({ success: true, dashboard });
}
