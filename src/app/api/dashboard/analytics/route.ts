import { NextResponse } from "next/server";
import {
  getAttendanceAnalytics,
  getAcademicAnalytics,
  getBehaviorAnalytics,
  getFinanceAnalytics,
} from "@/lib/queries/dashboard";

export async function GET() {
  const [attendance, academic, behavior, finance] = await Promise.all([
    getAttendanceAnalytics(),
    getAcademicAnalytics(),
    getBehaviorAnalytics(),
    getFinanceAnalytics(),
  ]);

  return NextResponse.json({ attendance, academic, behavior, finance });
}
