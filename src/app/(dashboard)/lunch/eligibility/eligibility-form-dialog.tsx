"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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

type ProgramType = "free_lunch" | "special_support" | "scholarship" | "paid";
type Status = "eligible" | "not_eligible" | "pending_review";

export function EligibilityFormDialog({ schoolId, students }: { schoolId: string; students: StudentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [programType, setProgramType] = useState<ProgramType>("free_lunch");
  const [status, setStatus] = useState<Status>("pending_review");
  const [mealRestrictions, setMealRestrictions] = useState("");

  async function handleSubmit() {
    if (!studentId) {
      toast.error("กรุณาเลือกนักเรียน");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("meal_eligibility").upsert(
      {
        school_id: schoolId,
        student_id: studentId,
        program_type: programType,
        status,
        meal_restrictions: mealRestrictions.trim() || null,
        reviewed_at: status !== "pending_review" ? new Date().toISOString() : null,
      },
      { onConflict: "school_id,student_id" }
    );

    setIsSubmitting(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("บันทึกสิทธิ์การรับอาหารสำเร็จ");
    setOpen(false);
    setMealRestrictions("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่ม/แก้ไขสิทธิ์
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>กำหนดสิทธิ์การรับอาหารกลางวัน</DialogTitle>
          <DialogDescription>เลือกนักเรียนและกำหนดสถานะสิทธิ์ตามโครงการ</DialogDescription>
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
          <Select value={programType} onValueChange={(v) => setProgramType(v as ProgramType)}>
            <SelectTrigger>
              <SelectValue placeholder="โครงการ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free_lunch">อาหารกลางวันฟรี</SelectItem>
              <SelectItem value="special_support">โครงการช่วยเหลือพิเศษ</SelectItem>
              <SelectItem value="scholarship">ทุนการศึกษา</SelectItem>
              <SelectItem value="paid">ชำระเงินเอง</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger>
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eligible">มีสิทธิ์</SelectItem>
              <SelectItem value="not_eligible">ไม่มีสิทธิ์</SelectItem>
              <SelectItem value="pending_review">รอตรวจสอบ</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="ข้อจำกัดด้านอาหาร (ไม่บังคับ)" value={mealRestrictions} onChange={(e) => setMealRestrictions(e.target.value)} />
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
