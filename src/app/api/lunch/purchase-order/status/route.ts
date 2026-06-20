import { NextRequest, NextResponse } from "next/server";
import { updatePurchaseOrderStatus } from "@/lib/queries/lunch";

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    await updatePurchaseOrderStatus(body.orderId, body.status);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : "อัปเดตสถานะไม่สำเร็จ" }, { status: 400 });
  }
}
