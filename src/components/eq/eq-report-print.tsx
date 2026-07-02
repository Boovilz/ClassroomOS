"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EqAssessment {
  id: string;
  created_at: string;
  self_awareness: number;
  self_regulation: number;
  motivation: number;
  empathy: number;
  social_skills: number;
  notes?: string | null;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_code?: string;
  classroom?: { name: string } | null;
}

const DIMENSIONS = [
  { key: "self_awareness" as keyof EqAssessment, label: "การตระหนักรู้ตนเอง (Self-Awareness)" },
  { key: "self_regulation" as keyof EqAssessment, label: "การควบคุมอารมณ์ (Self-Regulation)" },
  { key: "motivation" as keyof EqAssessment, label: "แรงจูงใจ (Motivation)" },
  { key: "empathy" as keyof EqAssessment, label: "การเข้าอกเข้าใจผู้อื่น (Empathy)" },
  { key: "social_skills" as keyof EqAssessment, label: "ทักษะสังคม (Social Skills)" },
];

function FilledCircles({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <span className="text-lg tracking-wider">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < score ? "text-primary" : "text-muted-foreground/30"}>
          {i < score ? "●" : "○"}
        </span>
      ))}
    </span>
  );
}

function getEqLevel(total: number): { label: string; variant: "destructive" | "secondary" | "default" | "outline" } {
  if (total <= 10) return { label: "ต่ำ", variant: "destructive" };
  if (total <= 15) return { label: "ปานกลาง", variant: "secondary" };
  if (total <= 20) return { label: "สูง", variant: "default" };
  return { label: "ดีเยี่ยม", variant: "outline" };
}

export function EqReportPrint({
  student,
  assessment,
}: {
  student: Student;
  assessment: EqAssessment;
}) {
  const total = DIMENSIONS.reduce((sum, d) => sum + ((assessment[d.key] as number) ?? 0), 0);
  const eqLevel = getEqLevel(total);
  const assessmentDate = new Date(assessment.created_at).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="print:hidden flex justify-end">
        <Button variant="outline" onClick={() => window.print()}>
          พิมพ์รายงาน
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6 print:border-none print:shadow-none space-y-6">
        {/* Header */}
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-bold">รายงานผลการประเมินความฉลาดทางอารมณ์ (EQ)</h2>
        </div>

        {/* Student info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">ชื่อ-นามสกุล: </span>
            <span className="font-medium">
              {student.first_name} {student.last_name}
            </span>
          </div>
          {student.student_code && (
            <div>
              <span className="text-muted-foreground">รหัสนักเรียน: </span>
              <span className="font-medium">{student.student_code}</span>
            </div>
          )}
          {student.classroom && (
            <div>
              <span className="text-muted-foreground">ห้องเรียน: </span>
              <span className="font-medium">{student.classroom.name}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">วันที่ประเมิน: </span>
            <span className="font-medium">{assessmentDate}</span>
          </div>
        </div>

        {/* Dimension scores */}
        <div>
          <h3 className="font-semibold mb-3">ผลการประเมินรายด้าน</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">ด้าน</th>
                <th className="text-center py-2 font-medium text-muted-foreground w-32">ระดับ</th>
                <th className="text-center py-2 font-medium text-muted-foreground w-16">คะแนน</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((dim) => {
                const score = (assessment[dim.key] as number) ?? 0;
                return (
                  <tr key={dim.key} className="border-b last:border-0">
                    <td className="py-3">{dim.label}</td>
                    <td className="py-3 text-center">
                      <FilledCircles score={score} />
                    </td>
                    <td className="py-3 text-center font-medium">{score}/5</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <div>
            <span className="text-sm text-muted-foreground">คะแนนรวมทั้งหมด</span>
            <p className="text-2xl font-bold">{total} / 25</p>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">ระดับ EQ</span>
            <div className="mt-1">
              <Badge variant={eqLevel.variant} className="text-sm px-3 py-1">
                {eqLevel.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Notes */}
        {assessment.notes && (
          <div>
            <h3 className="font-semibold mb-2">หมายเหตุ / ข้อสังเกต</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded border bg-muted/30 px-3 py-2">
              {assessment.notes}
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <span className="font-medium">เกณฑ์ระดับ EQ: </span>
          5–10 = ต่ำ &nbsp;|&nbsp; 11–15 = ปานกลาง &nbsp;|&nbsp; 16–20 = สูง &nbsp;|&nbsp; 21–25 = ดีเยี่ยม
        </div>
      </div>
    </div>
  );
}
