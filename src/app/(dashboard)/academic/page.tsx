import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAcademicDashboard } from "@/lib/queries/academic";
import { getAcademicAnalytics } from "@/lib/queries/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AcademicAnalyticsCharts } from "@/components/academic/academic-analytics-charts";
import { BookOpen, ClipboardList, GraduationCap, Target } from "lucide-react";

export default async function AcademicPage() {
  const supabase = await createClient();

  const [dashboard, analytics, { data: scores }, { data: subjects }] = await Promise.all([
    getAcademicDashboard(),
    getAcademicAnalytics(),
    supabase
      .from("scores")
      .select("id, score, max_score, term, students(full_name, student_code, deleted_at), subjects(name)")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<
        {
          id: string;
          score: number;
          max_score: number;
          term: string | null;
          students: { full_name: string; student_code: string; deleted_at: string | null } | null;
          subjects: { name: string } | null;
        }[]
      >(),
    supabase.from("subjects").select("id, name").order("name"),
  ]);

  const visibleScores = (scores ?? []).filter((s) => !s.students || !s.students.deleted_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">ผลการเรียน</h1>
          <p className="text-sm text-muted-foreground">
            {subjects && subjects.length > 0 ? `${subjects.length} วิชาในระบบ` : "ยังไม่มีวิชาในระบบ"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/academic/subjects">จัดการวิชา</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/academic/assignments">งาน/การประเมิน</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/academic/learning-outcomes">ผลการเรียนรู้</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/academic/certificates">เกียรติบัตร</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">เกรดเฉลี่ย (GPA)</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard.gpa.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">คะแนนเฉลี่ยรวม</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard.subjectAverage}%</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">อัตราการส่งงาน</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard.assignmentCompletionRatePercent}%</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">บรรลุมาตรฐานการเรียนรู้</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard.learningOutcomeAchievementPercent}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>คะแนนเฉลี่ยแยกตามวิชา</CardTitle>
        </CardHeader>
        <CardContent>
          <AcademicAnalyticsCharts data={analytics} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>นักเรียนผลการเรียนดีเด่น</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.topStudents.length > 0 ? (
              dashboard.topStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <span>
                    {s.student_code} - {s.full_name}
                  </span>
                  <Badge variant="success">{s.averagePercent}%</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>นักเรียนที่ควรเฝ้าระวัง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.atRiskStudents.length > 0 ? (
              dashboard.atRiskStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <span>
                    {s.student_code} - {s.full_name}
                  </span>
                  <Badge variant="destructive">{s.averagePercent}%</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">ไม่พบนักเรียนที่ควรเฝ้าระวัง</p>
            )}
          </CardContent>
        </Card>
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
              {visibleScores.length > 0 ? (
                visibleScores.map((s) => {
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
