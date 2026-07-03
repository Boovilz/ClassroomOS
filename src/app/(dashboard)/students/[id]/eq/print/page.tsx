import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EqReportPrint } from "@/components/eq/eq-report-print";

export default async function EqPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assessmentId?: string }>;
}) {
  const { id } = await params;
  const { assessmentId } = await searchParams;

  const supabase = await createClient();

  const [{ data: student }, { data: assessments }] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code").eq("id", id).single(),
    supabase
      .from("eq_assessments")
      .select("id, created_at, self_awareness, self_regulation, motivation, empathy, social_skills, notes")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!student) notFound();

  type EqRow = { id: string; created_at: string; self_awareness: number; self_regulation: number; motivation: number; empathy: number; social_skills: number; notes?: string | null };
  const rows = (assessments ?? []) as EqRow[];
  const assessment = assessmentId ? rows.find((a) => a.id === assessmentId) : rows[0];

  if (!assessment) {
    return <p className="p-8 text-center text-muted-foreground">ไม่พบข้อมูลการประเมิน EQ</p>;
  }

  const nameParts = student.full_name?.split(" ") ?? ["", ""];
  const studentForPrint = {
    id: student.id,
    first_name: nameParts[0] ?? student.full_name ?? "",
    last_name: nameParts.slice(1).join(" ") ?? "",
    student_code: student.student_code ?? undefined,
  };

  return <EqReportPrint student={studentForPrint} assessment={assessment} />;
}
