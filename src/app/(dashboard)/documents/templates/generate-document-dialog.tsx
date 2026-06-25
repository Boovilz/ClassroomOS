"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { FileText } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

export function GenerateDocumentDialog({
  templateId,
  templateName,
  students,
}: {
  templateId: string;
  templateName: string;
  students: StudentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGenerate() {
    if (!studentId) {
      toast.error("กรุณาเลือกนักเรียน");
      return;
    }
    setIsSubmitting(true);
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, studentId }),
    });
    const data = await res.json();
    setIsSubmitting(false);

    if (!res.ok) {
      toast.error("สร้างเอกสารล้มเหลว", { description: data.error });
      return;
    }

    toast.success("สร้างเอกสารสำเร็จ");
    if (data.downloadUrl) {
      window.open(data.downloadUrl, "_blank");
    }
    setOpen(false);
    setStudentId("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <FileText className="h-4 w-4" /> สร้างเอกสาร
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สร้างเอกสาร: {templateName}</DialogTitle>
          <DialogDescription>เลือกนักเรียนเพื่อสร้างและดาวน์โหลดเอกสาร</DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={isSubmitting}>
            {isSubmitting ? "กำลังสร้าง..." : "สร้างและดาวน์โหลด"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
