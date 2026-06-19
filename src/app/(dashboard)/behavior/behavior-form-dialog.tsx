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
import { Star } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

export function BehaviorFormDialog({ schoolId, students }: { schoolId: string; students: StudentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState<"positive" | "negative">("positive");
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("5");

  async function handleSubmit() {
    if (!studentId || !title.trim()) {
      toast.error("กรุณาเลือกนักเรียนและกรอกชื่อพฤติกรรม");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const pointsValue = category === "positive" ? Math.abs(Number(points)) : -Math.abs(Number(points));
    const now = new Date().toISOString();

    const { error } = await supabase.from("behavior_records").insert({
      school_id: schoolId,
      student_id: studentId,
      category,
      title: title.trim(),
      points: pointsValue,
      occurred_at: now,
    });

    if (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
      setIsSubmitting(false);
      return;
    }

    await supabase.from("xp_transactions").insert({
      school_id: schoolId,
      student_id: studentId,
      amount: pointsValue,
      reason: title.trim(),
    });

    const { data: student } = await supabase.from("students").select("xp").eq("id", studentId).single();
    if (student) {
      await supabase
        .from("students")
        .update({ xp: Math.max(0, student.xp + pointsValue) })
        .eq("id", studentId);
    }

    toast.success("บันทึกพฤติกรรมสำเร็จ");
    setOpen(false);
    setTitle("");
    setPoints("5");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Star className="h-4 w-4" />
          บันทึกพฤติกรรม
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกพฤติกรรมนักเรียน</DialogTitle>
          <DialogDescription>ให้คะแนนพฤติกรรมเชิงบวกหรือเชิงลบ จะถูกบันทึกเป็น XP ของนักเรียน</DialogDescription>
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

          <Select value={category} onValueChange={(v) => setCategory(v as "positive" | "negative")}>
            <SelectTrigger>
              <SelectValue placeholder="ประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="positive">เชิงบวก</SelectItem>
              <SelectItem value="negative">เชิงลบ</SelectItem>
            </SelectContent>
          </Select>

          <Input placeholder="ชื่อพฤติกรรม เช่น ช่วยเหลือเพื่อน" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="number" min={1} placeholder="คะแนน" value={points} onChange={(e) => setPoints(e.target.value)} />
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
