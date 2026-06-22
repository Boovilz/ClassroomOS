import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAiSynthesis } from "@/lib/ai";
import { getAiAcademicAnalysis } from "@/lib/queries/academic";
import { saveAiGeneratedContent } from "@/lib/queries/ai";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId } = body as { studentId?: string };
  if (!studentId) return NextResponse.json({ success: false, message: "Missing studentId" }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { data: student } = await supabase.from("students").select("full_name, school_id").eq("id", studentId).single();
    if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });

    const structuredFindings = await getAiAcademicAnalysis(studentId);
    const result = await getAiSynthesis({ studentName: student.full_name, domain: "academic", structuredFindings });

    if (!result.notConfigured) {
      await saveAiGeneratedContent({
        schoolId: student.school_id,
        studentId,
        contentType: "insight",
        domain: "academic",
        title: `วิเคราะห์ผลการเรียน: ${student.full_name}`,
        content: result.summary,
        createdBy: auth?.user?.id,
      });
    }

    return NextResponse.json({ success: true, result, structuredFindings });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
