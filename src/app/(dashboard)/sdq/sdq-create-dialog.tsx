"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus } from "lucide-react";
import { sdqAssessmentPeriodLabel, sdqAssessmentTypeLabel, type SdqAssessmentPeriod, type SdqAssessmentType } from "@/lib/queries/sdq-constants";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

export function SdqCreateDialog({ schoolId, currentUserId, students }: { schoolId: string; currentUserId: string; students: StudentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [assessmentType, setAssessmentType] = useState<SdqAssessmentType>("teacher");
  const [assessmentPeriod, setAssessmentPeriod] = useState<SdqAssessmentPeriod>("custom");

  async function handleSubmit() {
    if (!studentId) {
      toast.error("กรุณาเลือกนักเรียน");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sdq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          studentId,
          assessmentType,
          assessmentPeriod,
          assignedToUserId: assessmentType === "teacher" ? currentUserId : undefined,
          createdBy: currentUserId,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message ?? "สร้างแบบประเมินไม่สำเร็จ");
      toast.success("สร้างแบบประเมินสำเร็จ");
      setOpen(false);
      setStudentId("");
      router.push(`/sdq/${body.assessment.id}`);
      router.refresh();
    } catch (err) {
      toast.error("สร้างแบบประเมินไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          สร้างแบบประเมิน SDQ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สร้างแบบประเมิน SDQ ใหม่</DialogTitle>
          <DialogDescription>เลือกนักเรียน ประเภทผู้ประเมิน และรอบการประเมิน ระบบจะมอบหมายแบบประเมิน 25 ข้อให้ผู้ประเมินทำต่อไป</DialogDescription>
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
          <Select value={assessmentType} onValueChange={(v) => setAssessmentType(v as SdqAssessmentType)}>
            <SelectTrigger>
              <SelectValue placeholder="ประเภทผู้ประเมิน" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sdqAssessmentTypeLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assessmentPeriod} onValueChange={(v) => setAssessmentPeriod(v as SdqAssessmentPeriod)}>
            <SelectTrigger>
              <SelectValue placeholder="รอบการประเมิน" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sdqAssessmentPeriodLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {assessmentType === "parent" && (
            <p className="text-xs text-muted-foreground">
              หมายเหตุ: สำหรับการประเมินโดยผู้ปกครอง ระบบจะมอบหมายให้ผู้ปกครองหลักของนักเรียนคนนี้โดยอัตโนมัติ
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังสร้าง..." : "สร้างแบบประเมิน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
