import { NextResponse } from "next/server";
import { getAcademicDashboard } from "@/lib/queries/academic";

export async function GET() {
  const dashboard = await getAcademicDashboard();
  return NextResponse.json(dashboard);
}
