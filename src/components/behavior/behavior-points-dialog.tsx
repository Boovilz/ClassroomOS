"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Star, BookOpen } from "lucide-react";

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
  // คะแนนเก็บ — แยกจาก XP/ดาว
  const [scoreSubject, setScoreSubject] = useState("");
  const [scoreValue, setScoreValue] = useState("");
  const [scoreMax, setScoreMax] = useState("");

  const selectedCategory = categories.find((c) => c.id === categoryId);

  function reset() {
    setStudentId("");
    setCategoryId("");
    setNote("");
    setEvidenceUrl("");
    setScoreSubject("");
    setScoreValue("");
    setScoreMax("");
  }

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

    // Build description: include score info if provided
    let descParts: string[] = [];
    if (note.trim()) descParts.push(note.trim());
    if (scoreSubject.trim() && scoreValue.trim()) {
      const maxPart = scoreMax.trim() ? `/${scoreMax.trim()}` : "";
      descParts.push(`คะแนนเก็บ${scoreSubject.trim() ? ` (${scoreSubject.trim()})` : ""}: ${scoreValue.trim()}${maxPart}`);
    }
    const description = descParts.join(" | ") || null;

    const { data: record, error } = await supabase
      .from("behavior_records")
      .insert({
        school_id: schoolId,
        student_id: studentId,
        category: selectedCategory.category,
        title: selectedCategory.title,
        description,
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
    reset();
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Star className="h-4 w-4" />
          บันทึกพฤติกรรม
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>บันทึกพฤติกรรมนักเรียน</DialogTitle>
          <DialogDescription>เลือกพฤติกรรมจากรายการ คะแนนจะถูกบันทึกเป็น XP/เหรียญโดยอัตโนมัติ</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* นักเรียน */}
          <div className="space-y-1.5">
            <Label>นักเรียน</Label>
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
          </div>

          {/* ประเภทพฤติกรรม */}
          <div className="space-y-1.5">
            <Label>ประเภทพฤติกรรม</Label>
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
            {selectedCategory && (
              <p className={`text-xs font-medium ${selectedCategory.category === "positive" ? "text-emerald-600" : "text-red-500"}`}>
                {selectedCategory.category === "positive" ? "✅ พฤติกรรมดี" : "⚠️ พฤติกรรมที่ต้องปรับปรุง"} · XP {selectedCategory.points > 0 ? "+" : ""}{selectedCategory.points}
              </p>
            )}
          </div>

          {/* คะแนนเก็บ */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              คะแนนเก็บ <span className="text-xs text-muted-foreground font-normal">(แยกจาก XP — ไม่บังคับ)</span>
            </Label>
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              <Input
                placeholder="วิชา / กิจกรรม เช่น คณิตศาสตร์"
                value={scoreSubject}
                onChange={(e) => setScoreSubject(e.target.value)}
                className="h-8 text-sm bg-background"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="คะแนนที่ได้"
                  value={scoreValue}
                  onChange={(e) => setScoreValue(e.target.value)}
                  className="h-8 text-sm bg-background"
                  min={0}
                />
                <span className="text-muted-foreground text-sm shrink-0">/</span>
                <Input
                  type="number"
                  placeholder="คะแนนเต็ม"
                  value={scoreMax}
                  onChange={(e) => setScoreMax(e.target.value)}
                  className="h-8 text-sm bg-background"
                  min={0}
                />
              </div>
              {scoreValue && scoreMax && Number(scoreMax) > 0 && (
                <p className="text-xs text-muted-foreground">
                  = {Math.round((Number(scoreValue) / Number(scoreMax)) * 100)}%
                  {Number(scoreValue) / Number(scoreMax) >= 0.8 ? " 🌟 ยอดเยี่ยม" :
                   Number(scoreValue) / Number(scoreMax) >= 0.6 ? " 👍 ผ่าน" : " 📌 ต้องปรับปรุง"}
                </p>
              )}
            </div>
          </div>

          {/* หมายเหตุ + หลักฐาน */}
          <Textarea placeholder="หมายเหตุ (ถ้ามี)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
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
