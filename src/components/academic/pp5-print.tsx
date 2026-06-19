"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { StudentAcademicSummary } from "@/lib/queries/academic";

/**
 * ปพ.5 — internal school record of learning results, conduct and reading/
 * thinking/writing skills per Thai MOE convention. We do not store ปพ.5 as
 * a table; it's generated on demand from scores/attendance/behavior/
 * learning_outcomes, same as report cards.
 */
export function Pp5Print({ summary, schoolName }: { summary: StudentAcademicSummary; schoolName: string }) {
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
          <h2 className="text-lg font-semibold">แบบรายงานผู้สำเร็จการศึกษา (ปพ.5)</h2>
          <p className="text-sm text-muted-foreground">ระเบียนแสดงผลการเรียนและพัฒนาการของผู้เรียน</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <p>ชื่อ-นามสกุล: {summary.fullName}</p>
          <p>รหัสนักเรียน: {summary.studentCode}</p>
          <p>ชั้นเรียน: {summary.classroom ?? "-"}</p>
          <p>ระดับชั้น: {summary.grade ?? "-"}</p>
        </div>

        <h3 className="mb-2 mt-4 font-semibold">1. ผลการเรียนรายวิชา</h3>
        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="py-2 text-left">วิชา</th>
              <th className="py-2 text-right">หน่วยกิต</th>
              <th className="py-2 text-right">ผลการเรียน (ระดับคะแนน)</th>
            </tr>
          </thead>
          <tbody>
            {summary.subjectGrades.map((s, i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="py-2">{s.subjectName}</td>
                <td className="py-2 text-right">{s.credits}</td>
                <td className="py-2 text-right font-medium">{s.letterGrade.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="mb-2 mt-4 font-semibold">2. คุณลักษณะอันพึงประสงค์ / ผลการเรียนรู้ตามมาตรฐาน</h3>
        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="py-2 text-left">มาตรฐาน</th>
              <th className="py-2 text-left">รายละเอียด</th>
              <th className="py-2 text-right">ผลการประเมิน</th>
            </tr>
          </thead>
          <tbody>
            {summary.learningOutcomes.length > 0 ? (
              summary.learningOutcomes.map((o, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-2">{o.code}</td>
                  <td className="py-2">{o.description}</td>
                  <td className="py-2 text-right">
                    {o.status === "achieved" ? "ผ่าน" : o.status === "partially_achieved" ? "ผ่านบางส่วน" : "ไม่ผ่าน"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 text-center text-muted-foreground">
                  ยังไม่มีข้อมูลการประเมิน
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h3 className="mb-2 mt-4 font-semibold">3. สรุปผล</h3>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-muted-foreground">เกรดเฉลี่ยสะสม</p>
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
