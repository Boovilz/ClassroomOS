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

type MealType = "breakfast" | "lunch" | "snack";
type Status = "served" | "absent" | "special_diet";

export function MealRecordFormDialog({ schoolId, students }: { schoolId: string; students: StudentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [status, setStatus] = useState<Status>("served");
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    if (!studentId) {
      toast.error("กรุณาเลือกนักเรียน");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("meal_records").insert({
      school_id: schoolId,
      student_id: studentId,
      date,
      meal_type: mealType,
      status,
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("บันทึกการรับอาหารสำเร็จ");
    setOpen(false);
    setNotes("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          บันทึกการรับอาหาร
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกการรับอาหาร</DialogTitle>
          <DialogDescription>เช็คชื่อนักเรียนที่รับอาหารในแต่ละวัน</DialogDescription>
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
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
            <SelectTrigger>
              <SelectValue placeholder="ประเภทอาหาร" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">อาหารเช้า</SelectItem>
              <SelectItem value="lunch">อาหารกลางวัน</SelectItem>
              <SelectItem value="snack">อาหารว่าง</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger>
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="served">ได้รับแล้ว</SelectItem>
              <SelectItem value="absent">ขาด</SelectItem>
              <SelectItem value="special_diet">อาหารพิเศษ</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="หมายเหตุ (ไม่บังคับ)" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
