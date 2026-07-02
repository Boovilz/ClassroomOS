import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Printer } from "lucide-react";

// Thai letter grade from percentage
function percentToLetterGrade(percent: number): string {
  if (percent >= 80) return "A";
  if (percent >= 75) return "B+";
  if (percent >= 70) return "B";
  if (percent >= 65) return "C+";
  if (percent >= 60) return "C";
  if (percent >= 55) return "D+";
  if (percent >= 50) return "D";
  return "F";
}

type ScoreRow = {
  student_id: string;
  subject_id: string;
  score: number;
  max_score: number;
  subjects: { name: string } | null;
  students: { deleted_at: string | null } | null;
};

type StudentRow = {
  id: string;
  grade: string | null;
  classroom: string | null;
  deleted_at: string | null;
};

export default async function AcademicStatsPage() {
  const supabase = await createClient();

  const [{ data: rawScores }, { data: rawStudents }] = await Promise.all([
    supabase
      .from("scores")
      .select("student_id, subject_id, score, max_score, subjects(name), students(deleted_at)")
      .returns<ScoreRow[]>(),
    supabase
      .from("students")
      .select("id, grade, classroom, deleted_at")
      .is("deleted_at", null)
      .returns<StudentRow[]>(),
  ]);

  const scores = (rawScores ?? []).filter((s) => !s.students?.deleted_at);

  // --- Subject statistics ---
  type SubjectAgg = {
    name: string;
    studentIds: Set<string>;
    scores: number[];
  };
  const subjectMap = new Map<string, SubjectAgg>();

  for (const row of scores) {
    const pct = row.max_score > 0 ? (row.score / row.max_score) * 100 : 0;
    const agg = subjectMap.get(row.subject_id) ?? {
      name: row.subjects?.name ?? row.subject_id,
      studentIds: new Set<string>(),
      scores: [],
    };
    agg.studentIds.add(row.student_id);
    agg.scores.push(pct);
    subjectMap.set(row.subject_id, agg);
  }

  const subjectStats = Array.from(subjectMap.values())
    .map((agg) => {
      const avg = agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length;
      const max = Math.max(...agg.scores);
      const min = Math.min(...agg.scores);
      const passCount = agg.scores.filter((s) => s >= 50).length;
      const passPercent = agg.scores.length > 0 ? (passCount / agg.scores.length) * 100 : 0;
      return {
        name: agg.name,
        studentCount: agg.studentIds.size,
        avg: Math.round(avg * 10) / 10,
        max: Math.round(max * 10) / 10,
        min: Math.round(min * 10) / 10,
        passPercent: Math.round(passPercent * 10) / 10,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  // --- Overall summary ---
  const allPercents = scores.map((s) =>
    s.max_score > 0 ? (s.score / s.max_score) * 100 : 0
  );
  const overallAvg =
    allPercents.length > 0
      ? Math.round((allPercents.reduce((a, b) => a + b, 0) / allPercents.length) * 10) / 10
      : 0;
  const uniqueStudentsWithScores = new Set(scores.map((s) => s.student_id)).size;

  // --- Classroom distribution ---
  const classroomMap = new Map<string, number>();
  for (const st of rawStudents ?? []) {
    const key =
      st.grade && st.classroom
        ? `${st.grade}/${st.classroom}`
        : st.grade ?? st.classroom ?? "ไม่ระบุ";
    classroomMap.set(key, (classroomMap.get(key) ?? 0) + 1);
  }
  const classroomStats = Array.from(classroomMap.entries())
    .map(([classroom, count]) => ({ classroom, count }))
    .sort((a, b) => a.classroom.localeCompare(b.classroom, "th"));

  // --- Grade distribution from scores ---
  const gradeCounts: Record<string, number> = {
    A: 0,
    "B+": 0,
    B: 0,
    "C+": 0,
    C: 0,
    "D+": 0,
    D: 0,
    F: 0,
  };
  for (const pct of allPercents) {
    gradeCounts[percentToLetterGrade(pct)]++;
  }

  const reportDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/academic">
            <ArrowLeft className="h-4 w-4" />
            กลับหน้าวิชาการ
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          พิมพ์รายงาน
        </Button>
      </div>

      {/* Printable report */}
      <div className="mx-auto max-w-4xl space-y-6 print:space-y-4">
        {/* Report header */}
        <div className="rounded-xl border bg-white p-6 text-center shadow-sm print:border-none print:shadow-none">
          <h1 className="text-2xl font-bold">รายงานสถิติผลการเรียน</h1>
          <p className="mt-1 text-sm text-muted-foreground">ณ วันที่ {reportDate}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card className="glass-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm text-muted-foreground">นักเรียนที่มีคะแนน</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{uniqueStudentsWithScores} คน</CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm text-muted-foreground">คะแนนเฉลี่ยรวม</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{overallAvg}%</CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm text-muted-foreground">นักเรียนทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {(rawStudents ?? []).length} คน
            </CardContent>
          </Card>
        </div>

        {/* Subject statistics */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>สถิติรายวิชา</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {subjectStats.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">ยังไม่มีข้อมูลคะแนน</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วิชา</TableHead>
                    <TableHead className="text-center">จำนวนนักเรียน</TableHead>
                    <TableHead className="text-center">คะแนนเฉลี่ย</TableHead>
                    <TableHead className="text-center">สูงสุด</TableHead>
                    <TableHead className="text-center">ต่ำสุด</TableHead>
                    <TableHead className="text-center">ผ่าน%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectStats.map((s) => (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-center">{s.studentCount}</TableCell>
                      <TableCell className="text-center">{s.avg}%</TableCell>
                      <TableCell className="text-center">{s.max}%</TableCell>
                      <TableCell className="text-center">{s.min}%</TableCell>
                      <TableCell className="text-center">{s.passPercent}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Grade distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>การกระจายระดับผลการเรียน</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ระดับ</TableHead>
                  <TableHead>ช่วงคะแนน</TableHead>
                  <TableHead className="text-center">จำนวน</TableHead>
                  <TableHead className="text-center">คิดเป็น%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  [
                    { grade: "A", range: "80–100%" },
                    { grade: "B+", range: "75–79%" },
                    { grade: "B", range: "70–74%" },
                    { grade: "C+", range: "65–69%" },
                    { grade: "C", range: "60–64%" },
                    { grade: "D+", range: "55–59%" },
                    { grade: "D", range: "50–54%" },
                    { grade: "F", range: "0–49%" },
                  ] as { grade: string; range: string }[]
                ).map(({ grade, range }) => {
                  const count = gradeCounts[grade] ?? 0;
                  const pct =
                    allPercents.length > 0
                      ? Math.round((count / allPercents.length) * 1000) / 10
                      : 0;
                  return (
                    <TableRow key={grade}>
                      <TableCell className="font-semibold">{grade}</TableCell>
                      <TableCell className="text-muted-foreground">{range}</TableCell>
                      <TableCell className="text-center">{count}</TableCell>
                      <TableCell className="text-center">{pct}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Classroom/grade breakdown */}
        {classroomStats.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>จำนวนนักเรียนแยกตามระดับชั้น/ห้อง</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ระดับชั้น/ห้อง</TableHead>
                    <TableHead className="text-center">จำนวนนักเรียน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classroomStats.map((c) => (
                    <TableRow key={c.classroom}>
                      <TableCell>{c.classroom}</TableCell>
                      <TableCell className="text-center">{c.count} คน</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Print footer */}
        <div className="flex justify-center print:hidden">
          <Button
            variant="default"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            พิมพ์รายงาน
          </Button>
        </div>
      </div>
    </div>
  );
}
