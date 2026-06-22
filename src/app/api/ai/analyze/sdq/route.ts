import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAiSynthesis } from "@/lib/ai";
import { getAiSdqAnalysis, getSdqAssessment } from "@/lib/queries/sdq";
import { saveAiGeneratedContent } from "@/lib/queries/ai";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { assessmentId } = body as { assessmentId?: string };
  if (!assessmentId) return NextResponse.json({ success: false, message: "Missing assessmentId" }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const assessment = await getSdqAssessment(assessmentId);
    if (!assessment) return NextResponse.json({ success: false, message: "Assessment not found" }, { status: 404 });

    const studentName = assessment.students?.full_name ?? "นักเรียน";
    const structuredFindings = await getAiSdqAnalysis(assessmentId);
    const result = await getAiSynthesis({ studentName, domain: "sdq", structuredFindings });

    if (!result.notConfigured) {
      await saveAiGeneratedContent({
        schoolId: assessment.school_id,
        studentId: assessment.student_id,
        contentType: "insight",
        domain: "sdq",
        title: `วิเคราะห์ SDQ: ${studentName}`,
        content: result.summary,
        createdBy: auth?.user?.id,
      });
    }

    return NextResponse.json({ success: true, result, structuredFindings });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
