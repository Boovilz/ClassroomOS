"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { StudentAcademicSummary } from "@/lib/queries/academic";

export function ReportCardPrint({
  summary,
  schoolName,
}: {
  summary: StudentAcademicSummary;
  schoolName: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          พิมพ์ / บันทึก PDF
        </Button>
      </div>

      <div className="print-page mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card p-8 print:rounded-none print:border-0">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">{schoolName}</h1>
          <h2 className="text-lg font-semibold">สมุดรายงานผลการเรียน (Report Card)</h2>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <p>ชื่อ-นามสกุล: {summary.fullName}</p>
          <p>รหัสนักเรียน: {summary.studentCode}</p>
          <p>ชั้นเรียน: {summary.classroom ?? "-"}</p>
          <p>ระดับชั้น: {summary.grade ?? "-"}</p>
        </div>

        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="py-2 text-left">วิชา</th>
              <th className="py-2 text-right">หน่วยกิต</th>
              <th className="py-2 text-right">คะแนนเฉลี่ย (%)</th>
              <th className="py-2 text-right">เกรด</th>
            </tr>
          </thead>
          <tbody>
            {summary.subjectGrades.map((s, i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="py-2">{s.subjectName}</td>
                <td className="py-2 text-right">{s.credits}</td>
                <td className="py-2 text-right">{s.averagePercent}</td>
                <td className="py-2 text-right font-medium">{s.letterGrade.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-muted-foreground">เกรดเฉลี่ยสะสม (GPA)</p>
            <p className="text-xl font-bold">{summary.gpa.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-muted-foreground">อัตราการเข้าเรียน</p>
            <p className="text-xl font-bold">{summary.attendanceRatePercent}%</p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-muted-foreground">คะแนนพฤติกรรม</p>
            <p className="text-xl font-bold">{summary.behaviorScore}</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="mb-1 border-b border-dashed border-foreground/40 pb-8" />
            <p>ลงชื่อ ครูประจำชั้น</p>
          </div>
          <div>
            <div className="mb-1 border-b border-dashed border-foreground/40 pb-8" />
            <p>ลงชื่อ ผู้อำนวยการ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
