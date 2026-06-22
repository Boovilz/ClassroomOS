import { NextRequest, NextResponse } from "next/server";
import { notifyParent } from "@/lib/queries/communication";

/**
 * POST /api/notifications/send
 *
 * Writes a row into the shared `notifications` table and, if the parent has
 * a verified simulated-LINE link, also writes a simulated LINE push log
 * entry via sendLineMessage() (no real LINE API call is made - see
 * src/lib/queries/communication.ts header).
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { schoolId, parentId, title, body: content, category, priority, link, messageType } = body;

  if (!schoolId || !parentId || !title || !content || !category) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  try {
    await notifyParent({ schoolId, parentId, title, body: content, category, priority, link, messageType });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
