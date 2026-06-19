import { NextRequest, NextResponse } from "next/server";
import { getActiveHealthAlerts, resolveHealthAlert } from "@/lib/queries/health";

export async function GET() {
  const alerts = await getActiveHealthAlerts();
  return NextResponse.json({ alerts });
}

export async function PATCH(request: NextRequest) {
  const { alertId, resolvedBy } = await request.json();
  if (!alertId) {
    return NextResponse.json({ success: false, message: "Missing alertId" }, { status: 400 });
  }
  try {
    await resolveHealthAlert(alertId, resolvedBy ?? "");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
