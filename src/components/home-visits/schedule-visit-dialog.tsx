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
import { CalendarPlus } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

const visitTypeLabel: Record<string, string> = {
  routine: "เยี่ยมตามปกติ",
  follow_up: "ติดตามผล",
  emergency: "กรณีฉุกเฉิน",
  poverty_screening: "คัดกรองนักเรียนยากจน",
  welfare_check: "ตรวจสอบสวัสดิภาพ",
};

export function ScheduleVisitDialog({
  schoolId,
  teacherId,
  userId,
  students,
}: {
  schoolId: string;
  teacherId: string | null;
  userId: string | null;
  students: StudentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visitTime, setVisitTime] = useState("");
  const [visitType, setVisitType] = useState("routine");
  const [purpose, setPurpose] = useState("");

  async function handleSubmit() {
    if (!studentId) {
      toast.error("กรุณาเลือกนักเรียน");
      return;
    }
    setIsSubmitting(true);

    const res = await fetch("/api/home-visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        studentId,
        teacherId,
        visitDate,
        visitTime: visitTime || undefined,
        visitType,
        purpose: purpose.trim() || undefined,
        createdBy: userId ?? undefined,
      }),
    });
    const json = await res.json();

    setIsSubmitting(false);
    if (!json.success) {
      toast.error("นัดหมายไม่สำเร็จ", { description: json.message });
      return;
    }

    toast.success("นัดหมายเยี่ยมบ้านสำเร็จ");
    setOpen(false);
    setPurpose("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          นัดหมายเยี่ยมบ้าน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>นัดหมายเยี่ยมบ้าน</DialogTitle>
          <DialogDescription>กำหนดวันเวลาและประเภทการเยี่ยมบ้าน</DialogDescription>
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
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            <Input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
          </div>
          <Select value={visitType} onValueChange={setVisitType}>
            <SelectTrigger>
              <SelectValue placeholder="ประเภทการเยี่ยม" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(visitTypeLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="วัตถุประสงค์การเยี่ยมบ้าน" value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "นัดหมาย"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
