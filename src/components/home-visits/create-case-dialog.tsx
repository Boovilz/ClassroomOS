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
import { FolderPlus } from "lucide-react";

const concernTypeLabel: Record<string, string> = {
  welfare: "สวัสดิภาพ",
  academic: "ผลการเรียน",
  behavior: "พฤติกรรม",
  attendance: "การมาเรียน",
  health: "สุขภาพ",
  family: "ครอบครัว",
};

export function CreateCaseDialog({ schoolId, studentId }: { schoolId: string; studentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [concernType, setConcernType] = useState("welfare");
  const [description, setDescription] = useState("");

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("กรุณาระบุชื่อเคส");
      return;
    }
    setIsSubmitting(true);
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, studentId, title: title.trim(), concernType, description: description.trim() || undefined }),
    });
    const json = await res.json();
    setIsSubmitting(false);
    if (!json.success) {
      toast.error("เปิดเคสไม่สำเร็จ", { description: json.message });
      return;
    }
    toast.success("เปิดเคสสำเร็จ");
    setOpen(false);
    setTitle("");
    setDescription("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderPlus className="h-4 w-4" />
          เปิดเคสใหม่
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เปิดเคสติดตามนักเรียน</DialogTitle>
          <DialogDescription>ใช้สำหรับติดตามประเด็นที่ต้องดูแลต่อเนื่อง</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="ชื่อเคส" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={concernType} onValueChange={setConcernType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(concernTypeLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="รายละเอียด" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "เปิดเคส"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
