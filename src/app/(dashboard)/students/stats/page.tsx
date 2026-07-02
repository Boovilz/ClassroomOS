import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

function classifyGrade(grade: string): "ปฐมวัย" | "ประถมศึกษา" | "มัธยมต้น" | "มัธยมปลาย" | "อื่นๆ" {
  if (/อ\.|K|อนุบาล/.test(grade)) return "ปฐมวัย";
  if (/ป\.|^P|ประถม/.test(grade)) return "ประถมศึกษา";
  if (/ม\.1|ม\.2|ม\.3/.test(grade)) return "มัธยมต้น";
  if (/ม\.4|ม\.5|ม\.6/.test(grade)) return "มัธยมปลาย";
  return "อื่นๆ";
}

interface StudentRow {
  grade: string;
  classroom: string;
  gender: string;
}

interface ClassroomStat {
  grade: string;
  classroom: string;
  male: number;
  female: number;
  other: number;
}

export default async function StudentStatsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  let schoolId: string | null = null;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("users")
      .select("school_id")
      .eq("id", auth.user.id)
      .single();
    schoolId = profile?.school_id ?? null;
  }

  let students: StudentRow[] = [];
  if (schoolId) {
    const { data } = await supabase
      .from("students")
      .select("grade, classroom, gender")
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .eq("is_archived", false);
    students = (data as StudentRow[]) ?? [];
  }

  // Aggregate counts
  const total = students.length;
  let pratom = 0;
  let pathomwai = 0;
  let matthayomTon = 0;
  let matthayomPlai = 0;

  // Build classroom breakdown map
  const classroomMap = new Map<string, ClassroomStat>();

  for (const s of students) {
    const level = classifyGrade(s.grade ?? "");
    if (level === "ปฐมวัย") pathomwai++;
    else if (level === "ประถมศึกษา") pratom++;
    else if (level === "มัธยมต้น") matthayomTon++;
    else if (level === "มัธยมปลาย") matthayomPlai++;

    const key = `${s.grade}__${s.classroom}`;
    if (!classroomMap.has(key)) {
      classroomMap.set(key, { grade: s.grade ?? "", classroom: s.classroom ?? "", male: 0, female: 0, other: 0 });
    }
    const stat = classroomMap.get(key)!;
    const g = (s.gender ?? "").toLowerCase();
    if (g === "male" || g === "ชาย" || g === "m") stat.male++;
    else if (g === "female" || g === "หญิง" || g === "f") stat.female++;
    else stat.other++;
  }

  const matthayom = matthayomTon + matthayomPlai;

  // Sort classrooms: by grade alphabetically, then classroom
  const classroomStats = Array.from(classroomMap.values()).sort((a, b) => {
    if (a.grade < b.grade) return -1;
    if (a.grade > b.grade) return 1;
    if (a.classroom < b.classroom) return -1;
    if (a.classroom > b.classroom) return 1;
    return 0;
  });

  // Group by grade
  const gradeGroups = new Map<string, ClassroomStat[]>();
  for (const stat of classroomStats) {
    if (!gradeGroups.has(stat.grade)) gradeGroups.set(stat.grade, []);
    gradeGroups.get(stat.grade)!.push(stat);
  }

  const grades = Array.from(gradeGroups.keys());

  // Grand totals
  const grandMale = classroomStats.reduce((s, r) => s + r.male, 0);
  const grandFemale = classroomStats.reduce((s, r) => s + r.female, 0);
  const grandOther = classroomStats.reduce((s, r) => s + r.other, 0);
  const grandTotal = grandMale + grandFemale + grandOther;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 print:px-0 print:py-0">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/students">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">สถิตินักเรียน</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          พิมพ์
        </Button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block text-center pb-4 border-b">
        <h1 className="text-2xl font-bold">สถิตินักเรียน</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 print:grid-cols-4 print:gap-2">
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              นักเรียนทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{total.toLocaleString()}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">คน</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              ปฐมวัย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">{pathomwai.toLocaleString()}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">คน</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              ประถมศึกษา
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-800 dark:text-green-200">{pratom.toLocaleString()}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">คน</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              มัธยมศึกษา
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-800 dark:text-orange-200">{matthayom.toLocaleString()}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              คน (ต้น {matthayomTon} / ปลาย {matthayomPlai})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classroom Breakdown Table */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader>
          <CardTitle className="text-lg">ตารางแยกตามห้องเรียน</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">ระดับชั้น</TableHead>
                  <TableHead className="font-semibold">ห้อง</TableHead>
                  <TableHead className="text-center font-semibold">ชาย</TableHead>
                  <TableHead className="text-center font-semibold">หญิง</TableHead>
                  <TableHead className="text-center font-semibold">รวม</TableHead>
                  <TableHead className="font-semibold">หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => {
                  const rows = gradeGroups.get(grade)!;
                  const subtotalMale = rows.reduce((s, r) => s + r.male, 0);
                  const subtotalFemale = rows.reduce((s, r) => s + r.female, 0);
                  const subtotalOther = rows.reduce((s, r) => s + r.other, 0);
                  const subtotal = subtotalMale + subtotalFemale + subtotalOther;

                  return (
                    <>
                      {rows.map((row, idx) => (
                        <TableRow key={`${grade}-${row.classroom}-${idx}`}>
                          {idx === 0 ? (
                            <TableCell
                              rowSpan={rows.length + 1}
                              className="font-medium align-top border-r bg-muted/20"
                            >
                              {grade}
                            </TableCell>
                          ) : null}
                          <TableCell>{row.classroom}</TableCell>
                          <TableCell className="text-center">{row.male}</TableCell>
                          <TableCell className="text-center">{row.female}</TableCell>
                          <TableCell className="text-center font-medium">
                            {row.male + row.female + row.other}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {row.other > 0 ? `อื่นๆ ${row.other} คน` : ""}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Subtotal row */}
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell className="text-right text-sm text-muted-foreground pr-2">
                          รวม {grade}
                        </TableCell>
                        <TableCell className="text-center">{subtotalMale}</TableCell>
                        <TableCell className="text-center">{subtotalFemale}</TableCell>
                        <TableCell className="text-center">{subtotal}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {subtotalOther > 0 ? `อื่นๆ ${subtotalOther} คน` : ""}
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })}

                {/* Grand Total */}
                <TableRow className="bg-primary/10 font-bold text-base border-t-2">
                  <TableCell colSpan={2} className="font-bold">
                    รวมทั้งหมด
                  </TableCell>
                  <TableCell className="text-center">{grandMale}</TableCell>
                  <TableCell className="text-center">{grandFemale}</TableCell>
                  <TableCell className="text-center">{grandTotal}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {grandOther > 0 ? `อื่นๆ ${grandOther} คน` : ""}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Print footer */}
      <div className="hidden print:block text-center text-sm text-muted-foreground pt-4 border-t">
        พิมพ์เมื่อวันที่ {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
      </div>

      <style>{`
        @media print {
          nav, aside, header[data-sidebar], [data-sidebar] {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .container {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
