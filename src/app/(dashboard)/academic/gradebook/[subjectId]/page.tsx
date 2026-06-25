import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGradebook, getGradebookWeights } from "@/lib/queries/academic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradebookTable } from "@/components/academic/gradebook-table";
import { ScoreEntryDialog } from "@/components/academic/score-entry-dialog";
import { GradebookWeightsForm } from "@/components/academic/gradebook-weights-form";

export default async function GradebookPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const supabase = await createClient();

  const { data: subject } = await supabase.from("subjects").select("id, name, school_id").eq("id", subjectId).single();
  if (!subject) notFound();

  const [rows, weights, { data: students }] = await Promise.all([
    getGradebook(subjectId),
    getGradebookWeights(subjectId),
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).is("deleted_at", null).order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">สมุดคะแนน: {subject.name}</h1>
          <p className="text-sm text-muted-foreground">{rows.length} นักเรียนมีคะแนนบันทึกแล้ว</p>
        </div>
        <ScoreEntryDialog schoolId={subject.school_id} subjectId={subjectId} students={students ?? []} />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>น้ำหนักคะแนนแต่ละองค์ประกอบ (รวมต้องเท่ากับ 100)</CardTitle>
        </CardHeader>
        <CardContent>
          <GradebookWeightsForm schoolId={subject.school_id} subjectId={subjectId} initialWeights={weights} />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>สมุดคะแนนนักเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <GradebookTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
