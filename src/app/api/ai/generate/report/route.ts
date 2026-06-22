import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeReport } from "@/lib/ai";
import { getAiAcademicAnalysis } from "@/lib/queries/academic";
import { getAiBehaviorAnalysis } from "@/lib/queries/behavior";
import { saveAiGeneratedContent } from "@/lib/queries/ai";

/**
 * POST /api/ai/generate/report
 * Claude writes the prose "teacher comments" section that feeds into
 * Module 5's EXISTING report-card/ปพ.5/ปพ.6 templates - does not generate
 * a new document/template, only the remarks text.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, kind } = body as { studentId?: string; kind?: "academic" | "behavior" | "attendance" };
  if (!studentId || !kind) return NextResponse.json({ success: false, message: "Missing studentId or kind" }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { data: student } = await supabase.from("students").select("full_name, school_id").eq("id", studentId).single();
    if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });

    const structuredFindings =
      kind === "academic" ? await getAiAcademicAnalysis(studentId) : kind === "behavior" ? await getAiBehaviorAnalysis(studentId) : [];

    const result = await writeReport(kind, studentId, structuredFindings, student.full_name);

    if (!result.notConfigured) {
      await saveAiGeneratedContent({
        schoolId: student.school_id,
        studentId,
        contentType: "report",
        domain: kind,
        title: `รายงาน (${kind}): ${student.full_name}`,
        content: result.summary,
        createdBy: auth?.user?.id,
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
