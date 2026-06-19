import { NextResponse } from "next/server";
import { getHealthAnalytics } from "@/lib/queries/health";

export async function GET() {
  const analytics = await getHealthAnalytics();
  return NextResponse.json(analytics);
}
