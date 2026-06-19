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
import { Megaphone } from "lucide-react";

type Audience = "all" | "teachers" | "parents" | "students";

export function AnnouncementFormDialog({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      toast.error("กรุณากรอกหัวข้อและเนื้อหาประกาศ");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();

    const { error } = await supabase.from("announcements").insert({
      school_id: schoolId,
      created_by: auth.user?.id,
      title: title.trim(),
      body: body.trim(),
      audience,
      published_at: new Date().toISOString(),
    });

    setIsSubmitting(false);
    if (error) {
      toast.error("ส่งประกาศไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("ส่งประกาศสำเร็จ");
    setOpen(false);
    setTitle("");
    setBody("");
    setAudience("all");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Megaphone className="h-4 w-4" />
          ประกาศใหม่
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สร้างประกาศใหม่</DialogTitle>
          <DialogDescription>ส่งข่าวสารถึงกลุ่มเป้าหมายที่เลือก</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="หัวข้อประกาศ" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder="เนื้อหาประกาศ"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
          />
          <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
            <SelectTrigger>
              <SelectValue placeholder="กลุ่มเป้าหมาย" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกคน</SelectItem>
              <SelectItem value="teachers">ครู</SelectItem>
              <SelectItem value="parents">ผู้ปกครอง</SelectItem>
              <SelectItem value="students">นักเรียน</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังส่ง..." : "ส่งประกาศ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
