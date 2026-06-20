import { NextRequest, NextResponse } from "next/server";
import { addInventoryItem } from "@/lib/queries/lunch";

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const item = await addInventoryItem(body);
    return NextResponse.json({ success: true, item });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : "เพิ่มวัตถุดิบไม่สำเร็จ" }, { status: 400 });
  }
}
