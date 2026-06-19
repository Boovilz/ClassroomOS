import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStudentAcademicSummary } from "@/lib/queries/academic";
import { ReportCardPrint } from "@/components/academic/report-card-print";

export default async function ReportCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("school_id").eq("id", id).single();
  if (!student) notFound();

  const [summary, { data: school }] = await Promise.all([
    getStudentAcademicSummary(id),
    supabase.from("schools").select("name").eq("id", student.school_id).single(),
  ]);

  return <ReportCardPrint summary={summary} schoolName={school?.name ?? "-"} />;
}
