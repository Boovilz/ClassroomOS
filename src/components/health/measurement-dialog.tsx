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
import { Ruler } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

export function MeasurementDialog({ schoolId, students, userId }: { schoolId: string; students: StudentOption[]; userId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [remarks, setRemarks] = useState("");

  async function handleSubmit() {
    const height = Number(heightCm);
    const weight = Number(weightKg);
    if (!studentId || !height || !weight) {
      toast.error("กรุณาเลือกนักเรียนและระบุส่วนสูง/น้ำหนักให้ถูกต้อง");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/health/measurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, studentId, heightCm: height, weightKg: weight, remarks, recordedBy: userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("บันทึกไม่สำเร็จ", { description: data.message });
        return;
      }
      toast.success("บันทึกข้อมูลสุขภาพสำเร็จ");
      setOpen(false);
      setStudentId("");
      setHeightCm("");
      setWeightKg("");
      setRemarks("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Ruler className="h-4 w-4" />
          บันทึกส่วนสูง/น้ำหนัก
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกส่วนสูงและน้ำหนัก</DialogTitle>
          <DialogDescription>ระบบจะคำนวณค่า BMI และสถานะโภชนาการให้อัตโนมัติ</DialogDescription>
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
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="ส่วนสูง (ซม.)" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            <Input type="number" placeholder="น้ำหนัก (กก.)" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          <Textarea placeholder="หมายเหตุ (ถ้ามี)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
