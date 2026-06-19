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

export function DocumentFormDialog({ schoolId, students }: { schoolId: string; students: StudentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [studentId, setStudentId] = useState("");

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("กรุณากรอกชื่อเอกสาร");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();

    const { error } = await supabase.from("documents").insert({
      school_id: schoolId,
      student_id: studentId || null,
      uploaded_by: auth.user?.id,
      title: title.trim(),
      category: category.trim() || null,
      file_url: fileUrl.trim() || null,
    });

    setIsSubmitting(false);
    if (error) {
      toast.error("เพิ่มเอกสารไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("เพิ่มเอกสารสำเร็จ");
    setOpen(false);
    setTitle("");
    setCategory("");
    setFileUrl("");
    setStudentId("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มเอกสาร
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มเอกสารใหม่</DialogTitle>
          <DialogDescription>ระบุชื่อเอกสารและลิงก์ไฟล์ (เช่น Google Drive)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="ชื่อเอกสาร" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="หมวดหมู่ เช่น ใบลา, ใบรับรอง" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input placeholder="ลิงก์ไฟล์ (URL)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="เกี่ยวข้องกับนักเรียน (ไม่บังคับ)" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.student_code} - {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
