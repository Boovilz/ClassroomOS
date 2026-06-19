import { NextResponse } from "next/server";
import { getRiskStudents } from "@/lib/queries/attendance";

export async function GET() {
  const riskStudents = await getRiskStudents();
  return NextResponse.json({ riskStudents });
}
