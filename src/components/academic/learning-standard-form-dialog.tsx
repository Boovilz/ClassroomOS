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

interface SubjectOption {
  id: string;
  name: string;
}

export function LearningStandardFormDialog({ schoolId, subjects }: { schoolId: string; subjects: SubjectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit() {
    if (!subjectId || !code.trim() || !description.trim()) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/learning-standards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, subjectId, code, description }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "เกิดข้อผิดพลาด");
      toast.success("เพิ่มมาตรฐานการเรียนรู้สำเร็จ");
      setOpen(false);
      setCode("");
      setDescription("");
      router.refresh();
    } catch (error) {
      toast.error("เพิ่มมาตรฐานไม่สำเร็จ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มมาตรฐานการเรียนรู้
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มมาตรฐานการเรียนรู้</DialogTitle>
          <DialogDescription>กำหนดมาตรฐาน/ตัวชี้วัดของวิชาที่ต้องการติดตามผล</DialogDescription>
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
          <Input placeholder="รหัสมาตรฐาน (เช่น ว 1.1)" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="รายละเอียดมาตรฐาน" value={description} onChange={(e) => setDescription(e.target.value)} />
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
