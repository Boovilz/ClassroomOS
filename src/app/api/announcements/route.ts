import { NextRequest, NextResponse } from "next/server";
import { createAnnouncement, getAnnouncements } from "@/lib/queries/communication";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) {
    return NextResponse.json({ success: false, message: "Missing schoolId" }, { status: 400 });
  }
  const announcements = await getAnnouncements(schoolId);
  return NextResponse.json({ success: true, announcements });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, createdBy, title, body: content, audience, category, scheduledAt, attachmentUrls, targetClassrooms, targetParentIds, publishNow } = body;

  if (!schoolId || !title || !content) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const announcement = await createAnnouncement({
      schoolId,
      createdBy,
      title,
      body: content,
      audience,
      category,
      scheduledAt,
      attachmentUrls,
      targetClassrooms,
      targetParentIds,
      publishNow,
    });
    return NextResponse.json({ success: true, announcement });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
