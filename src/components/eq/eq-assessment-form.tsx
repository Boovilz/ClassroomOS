"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface EqDimension {
  key: "selfAwareness" | "selfRegulation" | "motivation" | "empathy" | "socialSkills";
  label: string;
  description: string;
}

const DIMENSIONS: EqDimension[] = [
  {
    key: "selfAwareness",
    label: "การตระหนักรู้ตนเอง",
    description: "ความสามารถในการรับรู้และเข้าใจอารมณ์ ความคิด และพฤติกรรมของตนเอง",
  },
  {
    key: "selfRegulation",
    label: "การควบคุมอารมณ์",
    description: "ความสามารถในการจัดการและควบคุมอารมณ์ของตนเองได้อย่างเหมาะสม",
  },
  {
    key: "motivation",
    label: "แรงจูงใจ",
    description: "ความสามารถในการกระตุ้นตนเองและมุ่งมั่นบรรลุเป้าหมาย",
  },
  {
    key: "empathy",
    label: "การเข้าอกเข้าใจผู้อื่น",
    description: "ความสามารถในการรับรู้และเข้าใจอารมณ์และความรู้สึกของผู้อื่น",
  },
  {
    key: "socialSkills",
    label: "ทักษะสังคม",
    description: "ความสามารถในการสื่อสาร สร้างความสัมพันธ์ และทำงานร่วมกับผู้อื่น",
  },
];

function getEqLevel(total: number): { label: string; variant: "destructive" | "secondary" | "default" | "outline" } {
  if (total <= 10) return { label: "ต่ำ", variant: "destructive" };
  if (total <= 15) return { label: "ปานกลาง", variant: "secondary" };
  if (total <= 20) return { label: "สูง", variant: "default" };
  return { label: "ดีเยี่ยม", variant: "outline" };
}

export function EqAssessmentForm({
  studentId,
  schoolId,
  onSuccess,
}: {
  studentId: string;
  schoolId: string;
  onSuccess?: () => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = DIMENSIONS.reduce((sum, d) => sum + (scores[d.key] ?? 0), 0);
  const allAnswered = DIMENSIONS.every((d) => scores[d.key] !== undefined);
  const eqLevel = allAnswered ? getEqLevel(total) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) {
      toast.error("กรุณาประเมินให้ครบทุกด้าน");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/eq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          schoolId,
          selfAwareness: scores.selfAwareness,
          selfRegulation: scores.selfRegulation,
          motivation: scores.motivation,
          empathy: scores.empathy,
          socialSkills: scores.socialSkills,
          notes,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "บันทึกไม่สำเร็จ");
      }
      toast.success("บันทึกผลประเมิน EQ สำเร็จ");
      setScores({});
      setNotes("");
      onSuccess?.();
    } catch (err) {
      toast.error("บันทึกไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {DIMENSIONS.map((dim) => (
        <div key={dim.key} className="space-y-2">
          <div>
            <Label className="text-base font-semibold">{dim.label}</Label>
            <p className="text-sm text-muted-foreground">{dim.description}</p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((val) => {
              const selected = scores[dim.key] === val;
              return (
                <Button
                  key={val}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  className="h-10 w-10 flex-1 p-0 text-sm font-medium"
                  onClick={() => setScores((prev) => ({ ...prev, [dim.key]: val }))}
                >
                  {val}
                </Button>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>น้อยที่สุด</span>
            <span>มากที่สุด</span>
          </div>
        </div>
      ))}

      {allAnswered && eqLevel && (
        <Card className="bg-muted/50">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <span className="text-sm text-muted-foreground">คะแนนรวม</span>
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
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">หมายเหตุ / ข้อสังเกต</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="บันทึกข้อสังเกตหรือหมายเหตุเพิ่มเติม..."
          rows={3}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isSubmitting || !allAnswered}>
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกผลประเมิน"}
        </Button>
      </div>
    </form>
  );
}
