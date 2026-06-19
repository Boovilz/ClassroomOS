import { NextResponse } from "next/server";
import { getTopStudents } from "@/lib/queries/dashboard";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit")) || 10;
  const students = await getTopStudents(limit);
  return NextResponse.json({ students });
}
