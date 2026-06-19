"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GradebookWeights } from "@/lib/queries/academic";

const LABELS: Record<keyof GradebookWeights, string> = {
  attendance_weight: "เข้าเรียน",
  homework_weight: "การบ้าน",
  assignment_weight: "งาน",
  quiz_weight: "ทดสอบย่อย",
  midterm_weight: "กลางภาค",
  final_weight: "ปลายภาค",
  project_weight: "โครงงาน",
  behavior_weight: "พฤติกรรม",
};

export function GradebookWeightsForm({
  schoolId,
  subjectId,
  initialWeights,
}: {
  schoolId: string;
  subjectId: string;
  initialWeights: GradebookWeights;
}) {
  const router = useRouter();
  const [weights, setWeights] = useState<GradebookWeights>(initialWeights);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = Object.values(weights).reduce((a, b) => a + Number(b || 0), 0);

  function update(key: keyof GradebookWeights, value: string) {
    setWeights((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  }

  async function handleSubmit() {
    if (Math.round(total) !== 100) {
      toast.error("น้ำหนักคะแนนรวมต้องเท่ากับ 100");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/grades/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, subjectId, weights }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "เกิดข้อผิดพลาด");
      toast.success("บันทึกน้ำหนักคะแนนสำเร็จ");
      router.refresh();
    } catch (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(LABELS) as (keyof GradebookWeights)[]).map((key) => (
          <div key={key} className="space-y-1">
            <p className="text-xs text-muted-foreground">{LABELS[key]}</p>
            <Input type="number" value={weights[key]} onChange={(e) => update(key, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${Math.round(total) === 100 ? "text-emerald-green" : "text-destructive"}`}>
          รวม: {total}%
        </p>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกน้ำหนักคะแนน"}
        </Button>
      </div>
    </div>
  );
}
