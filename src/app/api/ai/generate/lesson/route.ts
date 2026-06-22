import { NextRequest, NextResponse } from "next/server";
import { generateLessonAsset, currentUserContext, type LessonAssistantInput } from "@/lib/queries/ai";

/** POST /api/ai/generate/lesson - AI Lesson Assistant (genuinely new capability). */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { gradeLevel, subject, topic, activityType } = body as Partial<LessonAssistantInput>;
  if (!gradeLevel || !subject || !topic || !activityType) {
    return NextResponse.json({ success: false, message: "Missing gradeLevel, subject, topic, or activityType" }, { status: 400 });
  }

  try {
    const { schoolId, userId } = await currentUserContext();
    const result = await generateLessonAsset({ gradeLevel, subject, topic, activityType }, schoolId ?? undefined, userId ?? undefined);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
