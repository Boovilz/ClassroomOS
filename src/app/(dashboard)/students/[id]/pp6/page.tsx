import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStudentAcademicSummary } from "@/lib/queries/academic";
import { Pp6Print } from "@/components/academic/pp6-print";

export default async function Pp6Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("school_id").eq("id", id).single();
  if (!student) notFound();

  const [summary, { data: school }] = await Promise.all([
    getStudentAcademicSummary(id),
    supabase.from("schools").select("name").eq("id", student.school_id).single(),
  ]);

  return <Pp6Print summary={summary} schoolName={school?.name ?? "-"} />;
}
