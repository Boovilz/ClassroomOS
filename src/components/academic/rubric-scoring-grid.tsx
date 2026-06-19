"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RubricCriterion, RubricScoreEntry } from "@/lib/supabase/types";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

export function RubricScoringGrid({
  rubricId,
  criteria,
  students,
}: {
  rubricId: string;
  criteria: RubricCriterion[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalScore = Object.values(selections).reduce((sum, v) => sum + v, 0);

  function selectLevel(criterionName: string, levelIndex: number, points: number) {
    setSelections((prev) => ({ ...prev, [criterionName]: points, [`${criterionName}__levelIndex`]: levelIndex }));
  }

  async function handleSubmit() {
    if (!studentId || Object.keys(selections).length < criteria.length) {
      toast.error("กรุณาเลือกนักเรียนและให้คะแนนทุกเกณฑ์");
      return;
    }
    setIsSubmitting(true);
    const scores: RubricScoreEntry[] = criteria.map((c) => {
      const levelIndex = selections[`${c.name}__levelIndex`];
      const level = c.levels[levelIndex];
      return { criterion: c.name, levelLabel: level?.label ?? "-", points: selections[c.name] ?? 0 };
    });
    try {
      const res = await fetch("/api/rubrics/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubricId, studentId, scores }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "เกิดข้อผิดพลาด");
      toast.success("บันทึกคะแนนสำเร็จ");
      setSelections({});
      setStudentId("");
      router.refresh();
    } catch (error) {
      toast.error("บันทึกคะแนนไม่สำเร็จ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base">ให้คะแนนตามเกณฑ์</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกนักเรียน" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.student_code} - {s.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {criteria.map((criterion) => (
          <div key={criterion.name} className="space-y-2">
            <p className="text-sm font-medium">{criterion.name}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {criterion.levels.map((level, li) => (
                <button
                  key={li}
                  type="button"
                  onClick={() => selectLevel(criterion.name, li, level.points)}
                  className={cn(
                    "rounded-lg border p-2 text-left text-xs transition-colors",
                    selections[`${criterion.name}__levelIndex`] === li
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:bg-muted"
                  )}
                >
                  <p className="font-medium">{level.label}</p>
                  <p className="text-muted-foreground">{level.points} คะแนน</p>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between border-t pt-3">
          <p className="text-sm font-medium">คะแนนรวม: {totalScore}</p>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกคะแนน"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
