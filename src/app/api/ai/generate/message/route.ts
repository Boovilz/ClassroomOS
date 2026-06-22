import { NextRequest, NextResponse } from "next/server";
import { draftParentMessage, saveAiGeneratedContent, currentUserContext } from "@/lib/queries/ai";

/**
 * POST /api/ai/generate/message
 * AI Communication Assistant - Claude drafts/polishes a parent message.
 * Reuses Module 11's notification/communication-log plumbing for actually
 * sending (this endpoint only drafts text, does not send).
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, studentName, topic, tone } = body as {
    studentId?: string;
    studentName?: string;
    topic?: string;
    tone?: "formal" | "friendly";
  };
  if (!studentName || !topic) {
    return NextResponse.json({ success: false, message: "Missing studentName or topic" }, { status: 400 });
  }

  try {
    const result = await draftParentMessage({ studentName, topic, tone });
    const { schoolId, userId } = await currentUserContext();

    if (!result.notConfigured && schoolId) {
      await saveAiGeneratedContent({
        schoolId,
        studentId: studentId ?? null,
        contentType: "message_draft",
        domain: "communication",
        title: `ข้อความถึงผู้ปกครอง: ${studentName}`,
        content: result.text,
        createdBy: userId,
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
