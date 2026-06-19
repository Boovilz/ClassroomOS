"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

export function HomeVisitFormDialog({
  schoolId,
  teacherId,
  students,
}: {
  schoolId: string;
  teacherId: string | null;
  students: StudentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState("");
  const [familySituation, setFamilySituation] = useState("");
  const [followUp, setFollowUp] = useState(false);

  async function handleSubmit() {
    if (!studentId) {
      toast.error("กรุณาเลือกนักเรียน");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("home_visits").insert({
      school_id: schoolId,
      student_id: studentId,
      teacher_id: teacherId,
      visit_date: visitDate,
      summary: summary.trim() || null,
      family_situation: familySituation.trim() || null,
      follow_up_required: followUp,
    });

    setIsSubmitting(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("บันทึกการเยี่ยมบ้านสำเร็จ");
    setOpen(false);
    setSummary("");
    setFamilySituation("");
    setFollowUp(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          บันทึกการเยี่ยมบ้าน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกการเยี่ยมบ้าน</DialogTitle>
          <DialogDescription>กรอกข้อมูลการเยี่ยมบ้านของนักเรียน</DialogDescription>
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
          <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          <Textarea placeholder="สรุปการเยี่ยมบ้าน" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          <Textarea
            placeholder="สภาพความเป็นอยู่ของครอบครัว"
            value={familySituation}
            onChange={(e) => setFamilySituation(e.target.value)}
            rows={3}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={followUp}
              onChange={(e) => setFollowUp(e.target.checked)}
            />
            ต้องติดตามต่อ
          </label>
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
