"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

interface StandardOption {
  id: string;
  code: string;
  description: string;
}

const STATUS_OPTIONS = [
  { value: "achieved", label: "บรรลุมาตรฐาน" },
  { value: "partially_achieved", label: "บรรลุบางส่วน" },
  { value: "needs_improvement", label: "ต้องปรับปรุง" },
];

export function LearningOutcomeRecordDialog({
  schoolId,
  students,
  standards,
}: {
  schoolId: string;
  students: StudentOption[];
  standards: StandardOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [standardId, setStandardId] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    if (!studentId || !standardId || !status) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/learning-outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, studentId, standardId, status, notes: notes.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "เกิดข้อผิดพลาด");
      toast.success("บันทึกผลการเรียนรู้สำเร็จ");
      setOpen(false);
      setStudentId("");
      setStandardId("");
      setStatus("");
      setNotes("");
      router.refresh();
    } catch (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          บันทึกผลการเรียนรู้
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกผลการเรียนรู้ตามมาตรฐาน</DialogTitle>
          <DialogDescription>เลือกนักเรียนและมาตรฐานที่ต้องการประเมินผล</DialogDescription>
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
          <Select value={standardId} onValueChange={setStandardId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกมาตรฐาน" />
            </SelectTrigger>
            <SelectContent>
              {standards.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} - {s.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="ผลการประเมิน" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="หมายเหตุ (ถ้ามี)" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
