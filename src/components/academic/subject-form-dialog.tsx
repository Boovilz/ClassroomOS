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

interface TeacherOption {
  id: string;
  teacher_code: string | null;
}

export function SubjectFormDialog({ schoolId, teachers }: { schoolId: string; teachers: TeacherOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [grade, setGrade] = useState("");
  const [credits, setCredits] = useState("1");
  const [teacherId, setTeacherId] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("กรุณากรอกชื่อวิชา");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          name,
          code: code.trim() || undefined,
          grade: grade.trim() || undefined,
          credits: Number(credits) || 1,
          teacherId: teacherId || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "เกิดข้อผิดพลาด");
      toast.success("เพิ่มวิชาสำเร็จ");
      setOpen(false);
      setName("");
      setCode("");
      setGrade("");
      setCredits("1");
      setTeacherId("");
      router.refresh();
    } catch (error) {
      toast.error("เพิ่มวิชาไม่สำเร็จ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มวิชา
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มวิชาใหม่</DialogTitle>
          <DialogDescription>กรอกข้อมูลรายวิชาที่ต้องการเพิ่มในระบบ</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="ชื่อวิชา" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="รหัสวิชา (ถ้ามี)" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="ระดับชั้น (ถ้ามี)" value={grade} onChange={(e) => setGrade(e.target.value)} />
          <Input type="number" placeholder="หน่วยกิต" value={credits} onChange={(e) => setCredits(e.target.value)} />
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกครูผู้สอน (ถ้ามี)" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.teacher_code ?? t.id}
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
