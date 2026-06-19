import { NextResponse } from "next/server";
import { getHealthDashboard } from "@/lib/queries/health";

export async function GET() {
  const stats = await getHealthDashboard();
  return NextResponse.json(stats);
}
