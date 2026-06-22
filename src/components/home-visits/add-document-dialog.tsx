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
import { FilePlus } from "lucide-react";

export function AddDocumentDialog({
  visitId,
  schoolId,
  studentId,
}: {
  visitId: string;
  schoolId: string;
  studentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  async function handleSubmit() {
    if (!title.trim() || !fileUrl.trim()) {
      toast.error("กรุณาระบุชื่อเอกสารและ URL");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("documents").insert({
      school_id: schoolId,
      student_id: studentId,
      home_visit_id: visitId,
      title: title.trim(),
      file_url: fileUrl.trim(),
    });
    setIsSubmitting(false);
    if (error) {
      toast.error("เพิ่มเอกสารไม่สำเร็จ", { description: error.message });
      return;
    }
    toast.success("เพิ่มเอกสารสำเร็จ");
    setOpen(false);
    setTitle("");
    setFileUrl("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FilePlus className="h-4 w-4" />
          เพิ่มเอกสาร
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มเอกสารการเยี่ยมบ้าน</DialogTitle>
          <DialogDescription>เช่น หนังสือรับรองรายได้ ทะเบียนบ้าน หนังสือยินยอม บันทึกกรณี</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="ชื่อเอกสาร" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="URL เอกสาร" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "เพิ่มเอกสาร"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
