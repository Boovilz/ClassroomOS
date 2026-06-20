import { NextRequest, NextResponse } from "next/server";
import { adjustStock } from "@/lib/queries/lunch";

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const txn = await adjustStock(body);
    return NextResponse.json({ success: true, txn });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : "ปรับสต็อกไม่สำเร็จ" }, { status: 400 });
  }
}
