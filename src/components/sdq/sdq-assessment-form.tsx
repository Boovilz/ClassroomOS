"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { sdqSubscaleLabel, type SdqSubscale } from "@/lib/queries/sdq-constants";

interface QuestionOption {
  id: string;
  item_no: number;
  subscale: SdqSubscale;
  question_text_th: string;
}

const ANSWER_OPTIONS: { value: 0 | 1 | 2; label: string }[] = [
  { value: 0, label: "ไม่จริง" },
  { value: 1, label: "ค่อนข้างจริง" },
  { value: 2, label: "จริงแน่นอน" },
];

export function SdqAssessmentForm({
  assessmentId,
  schoolId,
  questions,
  initialAnswers,
  readOnly = false,
}: {
  assessmentId: string;
  schoolId: string;
  questions: QuestionOption[];
  initialAnswers: Record<string, 0 | 1 | 2>;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, 0 | 1 | 2>>(initialAnswers);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const progress = useMemo(() => (questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0), [answeredCount, questions.length]);

  async function handleAnswer(questionId: string, value: 0 | 1 | 2) {
    if (readOnly) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sdq/${assessmentId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, questionId, answerValue: value }),
      });
      if (!res.ok) throw new Error("บันทึกคำตอบไม่สำเร็จ");
    } catch (err) {
      toast.error("บันทึกคำตอบไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (answeredCount < questions.length) {
      toast.error(`กรุณาตอบให้ครบทุกข้อ (ตอบแล้ว ${answeredCount}/${questions.length})`);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sdq/${assessmentId}/submit`, { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message ?? "ส่งแบบประเมินไม่สำเร็จ");
      toast.success("ส่งแบบประเมินสำเร็จ");
      router.push(`/sdq/${assessmentId}`);
      router.refresh();
    } catch (err) {
      toast.error("ส่งแบบประเมินไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  let lastSubscale: SdqSubscale | null = null;

  return (
    <div className="space-y-4">
      <Card className="glass-card sticky top-0 z-10">
        <CardContent className="flex items-center gap-4 py-4">
          <Progress value={progress} className="flex-1" />
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {answeredCount}/{questions.length} ข้อ {isSaving && "· กำลังบันทึก..."}
          </span>
        </CardContent>
      </Card>

      {questions.map((q) => {
        const showSubscaleHeader = q.subscale !== lastSubscale;
        lastSubscale = q.subscale;
        return (
          <div key={q.id}>
            {showSubscaleHeader && <h3 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">{sdqSubscaleLabel[q.subscale]}</h3>}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {q.item_no}. {q.question_text_th}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {ANSWER_OPTIONS.map((opt) => {
                    const selected = answers[q.id] === opt.value;
                    return (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        disabled={readOnly}
                        onClick={() => handleAnswer(q.id, opt.value)}
                        className="h-auto py-2 text-xs sm:text-sm"
                      >
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}

      {!readOnly && (
        <div className="flex justify-end pt-4">
          <Button size="lg" onClick={handleSubmit} disabled={isSubmitting || answeredCount < questions.length}>
            {isSubmitting ? "กำลังส่ง..." : "ส่งแบบประเมิน"}
          </Button>
        </div>
      )}
    </div>
  );
}
