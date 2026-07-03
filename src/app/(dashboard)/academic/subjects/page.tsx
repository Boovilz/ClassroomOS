import { createClient } from "@/lib/supabase/server";
import { getSubjects } from "@/lib/queries/academic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SubjectFormDialog } from "@/components/academic/subject-form-dialog";

export default async function SubjectsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [subjects, { data: teachers }] = await Promise.all([
    getSubjects(),
    supabase.from("teachers").select("id, teacher_code").order("teacher_code"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">จัดการวิชา</h1>
          <p className="text-sm text-muted-foreground">{subjects.length} วิชาในระบบ</p>
        </div>
        {profile?.school_id && <SubjectFormDialog schoolId={profile.school_id} teachers={teachers ?? []} />}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายวิชาทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสวิชา</TableHead>
                <TableHead>ชื่อวิชา</TableHead>
                <TableHead>ระดับชั้น</TableHead>
                <TableHead>หน่วยกิต</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.length > 0 ? (
                subjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.code ?? "-"}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.grade ?? "-"}</TableCell>
                    <TableCell>{s.credits}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/academic/gradebook/${s.id}`}>สมุดคะแนน</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="ml-2">
                        <Link href={`/academic/pp5-subject-print?subjectId=${s.id}`}>พิมพ์ ปพ.5</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีวิชาในระบบ
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
