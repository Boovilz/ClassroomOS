"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
}

interface StudentRow {
  id: string;
  student_code: string;
  full_name: string;
  classroom: string | null;
  scores: (number | null)[];
  average: number | null;
  rank?: number;
}

interface Props {
  schoolName: string;
  grade: string;
  classroom: string;
  beYear: number;
  semester: number;
  subjects: Subject[];
  students: StudentRow[];
}

function scoreToGrade(score: number | null): string {
  if (score === null) return "-";
  if (score >= 80) return "4";
  if (score >= 75) return "3.5";
  if (score >= 70) return "3";
  if (score >= 65) return "2.5";
  if (score >= 60) return "2";
  if (score >= 55) return "1.5";
  if (score >= 50) return "1";
  return "0";
}

export function GradeReportPrintClient({ schoolName, grade, classroom, beYear, semester, subjects, students }: Props) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-bold">รายงานผลการเรียน</h1>
          <p className="text-sm text-muted-foreground">
            {grade}{classroom ? `/${classroom}` : ""} ภาคเรียนที่ {semester} ปีการศึกษา {beYear}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          พิมพ์รายงาน
        </Button>
      </div>

      <div className="print-page overflow-x-auto">
        {/* Header */}
        <div className="mb-4 text-center text-sm">
          <p className="font-bold">{schoolName}</p>
          <p className="font-bold">รายงานผลการเรียน</p>
          <p>
            ชั้น {grade}{classroom ? `/${classroom}` : ""} &nbsp; ภาคเรียนที่ {semester} &nbsp; ปีการศึกษา {beYear}
          </p>
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border bg-gray-50">
              <th className="border px-1 py-1 text-center w-8" rowSpan={2}>ที่</th>
              <th className="border px-1 py-1 text-center w-20" rowSpan={2}>รหัส</th>
              <th className="border px-1 py-1 text-left" rowSpan={2}>ชื่อ-สกุล</th>
              {subjects.map((s) => (
                <th key={s.id} className="border px-1 py-1 text-center max-w-[48px]">
                  {s.code || s.name}
                </th>
              ))}
              <th className="border px-1 py-1 text-center w-14" rowSpan={2}>เฉลี่ย</th>
              <th className="border px-1 py-1 text-center w-10" rowSpan={2}>อันดับ</th>
            </tr>
            <tr className="border bg-gray-50">
              {subjects.map((s) => (
                <th key={s.id} className="border px-1 py-1 text-center font-normal text-gray-600">
                  ({s.credits})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((s, i) => (
                <tr key={s.id} className="border hover:bg-gray-50">
                  <td className="border px-1 py-1 text-center">{i + 1}</td>
                  <td className="border px-1 py-1 text-center">{s.student_code}</td>
                  <td className="border px-1 py-1">{s.full_name}</td>
                  {s.scores.map((score, j) => (
                    <td key={j} className="border px-1 py-1 text-center">
                      {scoreToGrade(score)}
                    </td>
                  ))}
                  <td className="border px-1 py-1 text-center font-semibold">
                    {s.average !== null ? scoreToGrade(s.average) : "-"}
                  </td>
                  <td className="border px-1 py-1 text-center">{s.rank ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4 + subjects.length} className="border px-4 py-6 text-center text-muted-foreground">
                  ไม่พบข้อมูลนักเรียน
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {subjects.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground print:hidden">
            ยังไม่มีรายวิชาสำหรับปีการศึกษา {beYear} ภาคเรียนที่ {semester}
          </p>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 15mm; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
