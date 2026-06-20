import { NextRequest, NextResponse } from "next/server";
import { getNutritionAnalysis } from "@/lib/queries/lunch";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const menuId = searchParams.get("menuId");
  if (!menuId) {
    return NextResponse.json({ message: "Missing menuId" }, { status: 400 });
  }
  try {
    const analysis = await getNutritionAnalysis(menuId);
    return NextResponse.json(analysis);
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "วิเคราะห์ไม่สำเร็จ" }, { status: 400 });
  }
}
