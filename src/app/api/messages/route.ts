import { NextRequest, NextResponse } from "next/server";
import { sendMessage, getThreadMessages } from "@/lib/queries/communication";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");
  if (!threadId) {
    return NextResponse.json({ success: false, message: "Missing threadId" }, { status: 400 });
  }
  const messages = await getThreadMessages(threadId);
  return NextResponse.json({ success: true, messages });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, threadId, senderUserId, senderParentId, body: content, isQuickReply, attachmentUrls } = body;

  if (!schoolId || !threadId || !content) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    const message = await sendMessage({ schoolId, threadId, senderUserId, senderParentId, body: content, isQuickReply, attachmentUrls });
    return NextResponse.json({ success: true, message });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
