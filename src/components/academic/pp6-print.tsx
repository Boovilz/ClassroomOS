"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { StudentAcademicSummary } from "@/lib/queries/academic";

/**
 * ปพ.6 — student's individual permanent academic record / transcript
 * summarizing overall GPA per Thai MOE convention. Generated on demand,
 * not stored (same approach as ปพ.5/report-card).
 */
export function Pp6Print({ summary, schoolName }: { summary: StudentAcademicSummary; schoolName: string }) {
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
          <h2 className="text-lg font-semibold">แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล (ปพ.6)</h2>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <p>ชื่อ-นามสกุล: {summary.fullName}</p>
          <p>รหัสนักเรียน: {summary.studentCode}</p>
          <p>ชั้นเรียน: {summary.classroom ?? "-"}</p>
          <p>ระดับชั้น: {summary.grade ?? "-"}</p>
        </div>

        <div className="mb-4 rounded-xl border border-border/60 p-4 text-center">
          <p className="text-muted-foreground">เกรดเฉลี่ยสะสมตลอดหลักสูตร (GPAX)</p>
          <p className="text-3xl font-bold text-primary">{summary.gpa.toFixed(2)}</p>
        </div>

        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="py-2 text-left">วิชา</th>
              <th className="py-2 text-right">หน่วยกิต</th>
              <th className="py-2 text-right">ระดับคะแนน</th>
              <th className="py-2 text-right">หน่วยกิต x ระดับคะแนน</th>
            </tr>
          </thead>
          <tbody>
            {summary.subjectGrades.map((s, i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="py-2">{s.subjectName}</td>
                <td className="py-2 text-right">{s.credits}</td>
                <td className="py-2 text-right">{s.letterGrade.toFixed(1)}</td>
                <td className="py-2 text-right">{(s.credits * s.letterGrade).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2">รวม</td>
              <td className="py-2 text-right">{summary.subjectGrades.reduce((sum, s) => sum + s.credits, 0)}</td>
              <td />
              <td className="py-2 text-right">
                {summary.subjectGrades.reduce((sum, s) => sum + s.credits * s.letterGrade, 0).toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mb-4 text-sm text-muted-foreground">
          เอกสารนี้ออกให้เพื่อแสดงผลการเรียนสะสมตามระเบียบกระทรวงศึกษาธิการ และมีผลใช้เมื่อลงนามรับรองโดยผู้มีอำนาจ
        </p>

        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="mb-1 border-b border-dashed border-foreground/40 pb-8" />
            <p>ลงชื่อ นายทะเบียน</p>
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
