import { createClient } from "@/lib/supabase/server";
import { getAssignments, getRubrics } from "@/lib/queries/academic";
import { AssignmentCard } from "@/components/academic/assignment-card";
import { AssignmentFormDialog } from "@/components/academic/assignment-form-dialog";
import { RubricBuilder } from "@/components/academic/rubric-builder";
import { RubricScoringGrid } from "@/components/academic/rubric-scoring-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RubricCriterion } from "@/lib/supabase/types";

export default async function AssignmentsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [assignments, rubrics, { data: subjects }, { data: students }] = await Promise.all([
    getAssignments(),
    getRubrics(),
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">งาน/การประเมิน</h1>
          <p className="text-sm text-muted-foreground">{assignments.length} งาน/การประเมินในระบบ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile?.school_id && <AssignmentFormDialog schoolId={profile.school_id} subjects={subjects ?? []} />}
          <RubricBuilder subjects={subjects ?? []} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.length > 0 ? (
          assignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีงาน/การประเมินในระบบ</p>
        )}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>เกณฑ์การประเมิน (Rubrics)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rubrics.length > 0 ? (
            rubrics.map((r) => (
              <RubricScoringGrid
                key={r.id}
                rubricId={r.id}
                criteria={r.criteria as RubricCriterion[]}
                students={students ?? []}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มีเกณฑ์การประเมิน</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
