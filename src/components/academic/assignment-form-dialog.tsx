"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Plus } from "lucide-react";

interface SubjectOption {
  id: string;
  name: string;
}

const METHOD_OPTIONS = [
  { value: "quiz", label: "ทดสอบย่อย" },
  { value: "exam", label: "สอบ" },
  { value: "project", label: "โครงงาน" },
  { value: "observation", label: "สังเกตการณ์" },
  { value: "portfolio", label: "แฟ้มสะสมงาน" },
  { value: "performance_task", label: "ภาระงาน" },
  { value: "homework", label: "การบ้าน" },
];

const ASSESSMENT_TYPE_OPTIONS = [
  { value: "knowledge", label: "ความรู้ (K)" },
  { value: "process", label: "กระบวนการ (P)" },
  { value: "attitude", label: "เจตคติ (A)" },
  { value: "competency", label: "สมรรถนะ" },
  { value: "characteristic", label: "คุณลักษณะ" },
];

export function AssignmentFormDialog({ schoolId, subjects }: { schoolId: string; subjects: SubjectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [dueDate, setDueDate] = useState("");
  const [assessmentType, setAssessmentType] = useState("");
  const [method, setMethod] = useState("");

  async function handleSubmit() {
    if (!subjectId || !title.trim()) {
      toast.error("กรุณาเลือกวิชาและกรอกชื่องาน");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          subjectId,
          title,
          description: description.trim() || undefined,
          maxScore: Number(maxScore) || 100,
          dueDate: dueDate || undefined,
          assessmentType: assessmentType || undefined,
          method: method || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "เกิดข้อผิดพลาด");
      toast.success("เพิ่มงาน/การประเมินสำเร็จ");
      setOpen(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      setAssessmentType("");
      setMethod("");
      router.refresh();
    } catch (error) {
      toast.error("เพิ่มงานไม่สำเร็จ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มงาน/การประเมิน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มงาน/การประเมินใหม่</DialogTitle>
          <DialogDescription>กรอกข้อมูลงานหรือการประเมินที่ต้องการมอบหมาย</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกวิชา" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="ชื่องาน/การประเมิน" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="คำอธิบาย (ถ้ามี)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input type="number" placeholder="คะแนนเต็ม" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Select value={assessmentType} onValueChange={setAssessmentType}>
            <SelectTrigger>
              <SelectValue placeholder="ประเภทการประเมิน (K/P/A)" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_TYPE_OPTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue placeholder="วิธีการประเมิน" />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
