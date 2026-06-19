import { NextResponse } from "next/server";
import { getAiInsights } from "@/lib/queries/dashboard";

export async function GET() {
  const insights = await getAiInsights();
  return NextResponse.json({ insights });
}
