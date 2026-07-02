"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

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

const DIMENSIONS = [
  { key: "self_awareness" as keyof EqAssessment, label: "การตระหนักรู้ตนเอง" },
  { key: "self_regulation" as keyof EqAssessment, label: "การควบคุมอารมณ์" },
  { key: "motivation" as keyof EqAssessment, label: "แรงจูงใจ" },
  { key: "empathy" as keyof EqAssessment, label: "การเข้าอกเข้าใจผู้อื่น" },
  { key: "social_skills" as keyof EqAssessment, label: "ทักษะสังคม" },
];

function getEqLevel(total: number): { label: string; variant: "destructive" | "secondary" | "default" | "outline" } {
  if (total <= 10) return { label: "ต่ำ", variant: "destructive" };
  if (total <= 15) return { label: "ปานกลาง", variant: "secondary" };
  if (total <= 20) return { label: "สูง", variant: "default" };
  return { label: "ดีเยี่ยม", variant: "outline" };
}

function FilledCircles({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <span className="tracking-wider">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < score ? "text-primary" : "text-muted-foreground/30"}>
          {i < score ? "●" : "○"}
        </span>
      ))}
    </span>
  );
}

function EqHistoryRow({ assessment }: { assessment: EqAssessment }) {
  const [open, setOpen] = useState(false);
  const total = DIMENSIONS.reduce((sum, d) => sum + ((assessment[d.key] as number) ?? 0), 0);
  const eqLevel = getEqLevel(total);
  const date = new Date(assessment.created_at).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="glass-card">
      <CardContent className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{date}</span>
            <Badge variant={eqLevel.variant}>{eqLevel.label}</Badge>
            <span className="text-sm text-muted-foreground">{total}/25 คะแนน</span>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="border-t px-4 pb-4 pt-3 space-y-3">
            <table className="w-full text-sm">
              <tbody>
                {DIMENSIONS.map((dim) => {
                  const score = (assessment[dim.key] as number) ?? 0;
                  return (
                    <tr key={dim.key} className="border-b last:border-0">
                      <td className="py-2 text-muted-foreground">{dim.label}</td>
                      <td className="py-2 text-center">
                        <FilledCircles score={score} />
                      </td>
                      <td className="py-2 text-right font-medium">{score}/5</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {assessment.notes && (
              <div className="rounded bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">หมายเหตุ: </span>
                {assessment.notes}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EqHistoryList({ studentId }: { studentId: string }) {
  const [assessments, setAssessments] = useState<EqAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/eq?studentId=${encodeURIComponent(studentId)}`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const data = await res.json();
        setAssessments(Array.isArray(data) ? data : data.data ?? []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (assessments.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการประเมิน EQ</p>;
  }

  return (
    <div className="space-y-3">
      {assessments.map((a) => (
        <EqHistoryRow key={a.id} assessment={a} />
      ))}
    </div>
  );
}
