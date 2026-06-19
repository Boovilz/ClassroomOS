import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AcademicPage() {
  const supabase = await createClient();

  const [{ data: scores }, { data: subjects }] = await Promise.all([
    supabase
      .from("scores")
      .select("id, score, max_score, term, students(full_name, student_code), subjects(name)")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<
        {
          id: string;
          score: number;
          max_score: number;
          term: string | null;
          students: { full_name: string; student_code: string } | null;
          subjects: { name: string } | null;
        }[]
      >(),
    supabase.from("subjects").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ผลการเรียน</h1>
        <p className="text-sm text-muted-foreground">
          {subjects && subjects.length > 0 ? `${subjects.length} วิชาในระบบ` : "ยังไม่มีวิชาในระบบ"}
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>คะแนนล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสนักเรียน</TableHead>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>วิชา</TableHead>
                <TableHead>ภาคเรียน</TableHead>
                <TableHead className="text-right">คะแนน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores && scores.length > 0 ? (
                scores.map((s) => {
                  const student = Array.isArray(s.students) ? s.students[0] : s.students;
                  const subject = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{student?.student_code}</TableCell>
                      <TableCell>{student?.full_name}</TableCell>
                      <TableCell>{subject?.name ?? "-"}</TableCell>
                      <TableCell>{s.term ?? "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {s.score} / {s.max_score}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีข้อมูลผลการเรียน
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
