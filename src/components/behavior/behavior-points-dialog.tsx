"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

interface CategoryOption {
  id: string;
  category: "positive" | "negative";
  title: string;
  points: number;
}

export function BehaviorPointsDialog({
  schoolId,
  students,
  categories,
}: {
  schoolId: string;
  students: StudentOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function handleSubmit() {
    if (!studentId || !selectedCategory) {
      toast.error("กรุณาเลือกนักเรียนและประเภทพฤติกรรม");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const signedPoints = selectedCategory.category === "positive"
      ? Math.abs(selectedCategory.points)
      : -Math.abs(selectedCategory.points);
    const now = new Date().toISOString();

    const { data: record, error } = await supabase
      .from("behavior_records")
      .insert({
        school_id: schoolId,
        student_id: studentId,
        category: selectedCategory.category,
        title: selectedCategory.title,
        description: note.trim() || null,
        evidence_url: evidenceUrl.trim() || null,
        points: signedPoints,
        occurred_at: now,
      })
      .select()
      .single();

    if (error || !record) {
      toast.error("บันทึกไม่สำเร็จ", { description: error?.message });
      setIsSubmitting(false);
      return;
    }

    await supabase.from("xp_transactions").insert({
      school_id: schoolId,
      student_id: studentId,
      amount: signedPoints,
      reason: selectedCategory.title,
      related_behavior_record_id: record.id,
    });

    const coinDelta = signedPoints > 0 ? Math.max(1, Math.round(signedPoints / 5)) : 0;
    if (coinDelta > 0) {
      await supabase.from("coin_transactions").insert({
        school_id: schoolId,
        student_id: studentId,
        amount: coinDelta,
        reason: `รางวัลพฤติกรรม: ${selectedCategory.title}`,
      });
    }

    const { data: student } = await supabase
      .from("students")
      .select("xp, coins, behavior_score")
      .eq("id", studentId)
      .single();
    if (student) {
      const currentScore = (student as { behavior_score?: number }).behavior_score ?? 100;
      await supabase
        .from("students")
        .update({
          xp: Math.max(0, student.xp + signedPoints),
          coins: student.coins + coinDelta,
          behavior_score: Math.min(200, Math.max(0, currentScore + signedPoints)),
        })
        .eq("id", studentId);
    }

    toast.success("บันทึกพฤติกรรมสำเร็จ");
    setOpen(false);
    setStudentId("");
    setCategoryId("");
    setNote("");
    setEvidenceUrl("");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Star className="h-4 w-4" />
          บันทึกพฤติกรรม
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกพฤติกรรมนักเรียน</DialogTitle>
          <DialogDescription>เลือกพฤติกรรมจากรายการ คะแนนจะถูกบันทึกเป็น XP/เหรียญโดยอัตโนมัติ</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกพฤติกรรม" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title} ({c.points > 0 ? "+" : ""}{c.points})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea placeholder="หมายเหตุ (ถ้ามี)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Input placeholder="ลิงก์หลักฐาน (ถ้ามี)" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
