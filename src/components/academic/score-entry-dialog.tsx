"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

const COMPONENT_OPTIONS = [
  { value: "attendance", label: "เข้าเรียน" },
  { value: "homework", label: "การบ้าน" },
  { value: "assignment", label: "งาน" },
  { value: "quiz", label: "ทดสอบย่อย" },
  { value: "midterm", label: "กลางภาค" },
  { value: "final", label: "ปลายภาค" },
  { value: "project", label: "โครงงาน" },
  { value: "behavior", label: "พฤติกรรม" },
];

export function ScoreEntryDialog({
  schoolId,
  subjectId,
  students,
}: {
  schoolId: string;
  subjectId: string;
  students: StudentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [component, setComponent] = useState("");

  async function handleSubmit() {
    if (!studentId || !score || !component) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          subjectId,
          studentId,
          score: Number(score),
          maxScore: Number(maxScore) || 100,
          component,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "เกิดข้อผิดพลาด");
      toast.success("บันทึกคะแนนสำเร็จ");
      setOpen(false);
      setStudentId("");
      setScore("");
      setComponent("");
      router.refresh();
    } catch (error) {
      toast.error("บันทึกคะแนนไม่สำเร็จ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          บันทึกคะแนน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกคะแนน</DialogTitle>
          <DialogDescription>เลือกนักเรียนและองค์ประกอบคะแนนที่ต้องการบันทึก</DialogDescription>
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
          <Select value={component} onValueChange={setComponent}>
            <SelectTrigger>
              <SelectValue placeholder="องค์ประกอบคะแนน" />
            </SelectTrigger>
            <SelectContent>
              {COMPONENT_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="คะแนนที่ได้" value={score} onChange={(e) => setScore(e.target.value)} />
          <Input type="number" placeholder="คะแนนเต็ม" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
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
