import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAiSynthesis } from "@/lib/ai";
import { getRiskStudents } from "@/lib/queries/attendance";
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

    const riskStudents = await getRiskStudents();
    const row = riskStudents.find((r) => r.student_id === studentId);
    const structuredFindings = row
      ? [
          `อัตราการมาเรียน ${row.attendance_rate_percent}%`,
          `ขาดเรียน ${row.absences_last_30_days} วันใน 30 วันที่ผ่านมา`,
          `มาสาย ${row.late_count_last_30_days} ครั้งใน 30 วันที่ผ่านมา`,
          `ระดับความเสี่ยง: ${row.risk_level} (${row.reason})`,
        ]
      : ["ไม่พบความเสี่ยงด้านการมาเรียนที่ชัดเจนในช่วง 30 วันที่ผ่านมา"];

    const result = await getAiSynthesis({ studentName: student.full_name, domain: "attendance", structuredFindings });

    if (!result.notConfigured) {
      await saveAiGeneratedContent({
        schoolId: student.school_id,
        studentId,
        contentType: "insight",
        domain: "attendance",
        title: `วิเคราะห์การมาเรียน: ${student.full_name}`,
        content: result.summary,
        createdBy: auth?.user?.id,
      });
    }

    return NextResponse.json({ success: true, result, structuredFindings });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
