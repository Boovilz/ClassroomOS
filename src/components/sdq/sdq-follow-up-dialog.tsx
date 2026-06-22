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
import { CalendarPlus } from "lucide-react";

export function SdqFollowUpDialog({
  assessmentId,
  schoolId,
  studentId,
  studentName,
  currentUserId,
}: {
  assessmentId: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(`ติดตามผลประเมิน SDQ - ${studentName}`);
  const [description, setDescription] = useState("");

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("กรุณากรอกชื่อเรื่อง");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sdq/${assessmentId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, studentId, title, description, openedBy: currentUserId }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message ?? "สร้างการติดตามไม่สำเร็จ");
      toast.success("เปิดเคสติดตามสำเร็จ (เชื่อมโยงกับระบบบริหารกรณีนักเรียน)");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error("เปิดเคสติดตามไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          กำหนดการติดตามผล
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>กำหนดการติดตามผล</DialogTitle>
          <DialogDescription>
            ระบบจะเปิดเคสในระบบบริหารกรณีนักเรียน (Case Management) ที่เชื่อมโยงกับผลประเมิน SDQ นี้ เพื่อติดตามและสร้างแผนช่วยเหลือต่อไป
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อเรื่อง" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="รายละเอียด / ข้อสังเกตเพิ่มเติม" rows={3} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "เปิดเคสติดตาม"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
