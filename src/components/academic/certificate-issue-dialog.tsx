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
import { Award } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

const TEMPLATE_OPTIONS: { value: string; label: string }[] = [
  { value: "graduation", label: "วุฒิบัตรจบการศึกษา" },
  { value: "honor_roll", label: "เกียรติบัตรผลการเรียนดีเยี่ยม" },
  { value: "perfect_attendance", label: "เกียรติบัตรมาเรียนสมบูรณ์" },
  { value: "subject_excellence", label: "เกียรติบัตรความเป็นเลิศทางวิชาการ" },
  { value: "completion", label: "วุฒิบัตรผ่านการอบรม/กิจกรรม" },
  { value: "other", label: "อื่นๆ" },
];

export function CertificateIssueDialog({ schoolId, students }: { schoolId: string; students: StudentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit() {
    if (!studentId || !templateType || !title.trim()) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, studentId, templateType, title, description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "เกิดข้อผิดพลาด");
      toast.success("ออกเกียรติบัตรสำเร็จ");
      setOpen(false);
      setStudentId("");
      setTemplateType("");
      setTitle("");
      setDescription("");
      router.refresh();
    } catch (error) {
      toast.error("ออกเกียรติบัตรไม่สำเร็จ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Award className="h-4 w-4" />
          ออกเกียรติบัตร
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ออกเกียรติบัตร / วุฒิบัตร</DialogTitle>
          <DialogDescription>เลือกนักเรียนและประเภทเกียรติบัตรที่ต้องการออก</DialogDescription>
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
          <Select value={templateType} onValueChange={setTemplateType}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกประเภทเกียรติบัตร" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="หัวข้อ (เช่น เกียรติบัตรนักเรียนดีเด่น ปีการศึกษา 2569)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังออกเกียรติบัตร..." : "ออกเกียรติบัตร"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
