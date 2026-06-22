import { NextRequest, NextResponse } from "next/server";
import { createEvent, getEvents } from "@/lib/queries/communication";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) {
    return NextResponse.json({ success: false, message: "Missing schoolId" }, { status: 400 });
  }
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const events = await getEvents(schoolId, from && to ? { from, to } : undefined);
  return NextResponse.json({ success: true, events });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, createdBy, title, description, eventCategory, classroom, location, startsAt, endsAt } = body;

  if (!schoolId || !title || !startsAt) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const event = await createEvent({ schoolId, createdBy, title, description, eventCategory, classroom, location, startsAt, endsAt });
    return NextResponse.json({ success: true, event });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
