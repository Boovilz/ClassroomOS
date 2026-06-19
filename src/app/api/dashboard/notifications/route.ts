import { NextResponse } from "next/server";
import { getNotifications } from "@/lib/queries/dashboard";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit")) || 20;
  const notifications = await getNotifications(limit);
  return NextResponse.json({ notifications });
}
