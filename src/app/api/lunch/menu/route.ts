import { NextRequest, NextResponse } from "next/server";
import { createMenu, getMenuByDate } from "@/lib/queries/lunch";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const mealType = (searchParams.get("mealType") as "breakfast" | "lunch" | "snack" | null) ?? "lunch";

  if (!schoolId) {
    return NextResponse.json({ message: "Missing schoolId" }, { status: 400 });
  }

  const result = await getMenuByDate(schoolId, date, mealType);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const menu = await createMenu(body);
    return NextResponse.json({ success: true, menu });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : "สร้างเมนูไม่สำเร็จ" }, { status: 400 });
  }
}
