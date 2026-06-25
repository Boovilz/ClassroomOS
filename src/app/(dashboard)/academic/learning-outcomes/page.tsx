import { createClient } from "@/lib/supabase/server";
import { getLearningStandards } from "@/lib/queries/academic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LearningStandardFormDialog } from "@/components/academic/learning-standard-form-dialog";
import { LearningOutcomeRecordDialog } from "@/components/academic/learning-outcome-record-dialog";

export default async function LearningOutcomesPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [standards, { data: subjects }, { data: students }] = await Promise.all([
    getLearningStandards(),
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).is("deleted_at", null).order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">ผลการเรียนรู้ตามมาตรฐาน</h1>
          <p className="text-sm text-muted-foreground">{standards.length} มาตรฐานในระบบ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile?.school_id && (
            <>
              <LearningStandardFormDialog schoolId={profile.school_id} subjects={subjects ?? []} />
              <LearningOutcomeRecordDialog
                schoolId={profile.school_id}
                students={students ?? []}
                standards={standards.map((s) => ({ id: s.id, code: s.code, description: s.description }))}
              />
            </>
          )}
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>มาตรฐานการเรียนรู้ทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead>วิชา</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standards.length > 0 ? (
                standards.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.code}</TableCell>
                    <TableCell>{s.description}</TableCell>
                    <TableCell>{s.subjects?.name ?? "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีมาตรฐานการเรียนรู้ในระบบ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
