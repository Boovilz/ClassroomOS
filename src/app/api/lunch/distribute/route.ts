import { NextRequest, NextResponse } from "next/server";
import { distributeMeal } from "@/lib/queries/lunch";

/** QR / student-ID / manual meal distribution — mirrors /api/attendance/scan's verify-and-record pipeline. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, token, studentId, mealType, menuId, distributedBy, distributionMethod } = body;

  if (!schoolId) {
    return NextResponse.json({ success: false, message: "Missing schoolId" }, { status: 400 });
  }
  if (!token && !studentId) {
    return NextResponse.json({ success: false, message: "Missing token or studentId" }, { status: 400 });
  }

  const result = await distributeMeal({
    schoolId,
    token,
    studentId,
    mealType,
    menuId,
    distributedBy,
    distributionMethod: distributionMethod ?? (token ? "qr" : "manual"),
  });

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
