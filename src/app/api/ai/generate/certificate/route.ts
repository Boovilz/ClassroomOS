import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCertificateText } from "@/lib/ai";
import { saveAiGeneratedContent } from "@/lib/queries/ai";

/**
 * POST /api/ai/generate/certificate
 * Thin layer: Claude writes ONLY the citation/description text inserted
 * into Module 5's EXISTING certificate component (issueCertificate()).
 * No new PDF/rendering pipeline - PDF export remains print-to-PDF only.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, templateType, achievementTitle } = body as { studentId?: string; templateType?: string; achievementTitle?: string };
  if (!studentId || !templateType || !achievementTitle) {
    return NextResponse.json({ success: false, message: "Missing studentId, templateType, or achievementTitle" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { data: student } = await supabase.from("students").select("full_name, school_id").eq("id", studentId).single();
    if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });

    const result = await generateCertificateText({ studentName: student.full_name, templateType, achievementTitle });

    if (!result.notConfigured) {
      await saveAiGeneratedContent({
        schoolId: student.school_id,
        studentId,
        contentType: "certificate_text",
        domain: templateType,
        title: `ข้อความใบประกาศ: ${student.full_name}`,
        content: result.summary,
        createdBy: auth?.user?.id,
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
