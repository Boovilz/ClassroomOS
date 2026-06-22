"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { ImagePlus } from "lucide-react";

const categoryLabel: Record<string, string> = {
  house: "บ้าน",
  study_area: "พื้นที่อ่านหนังสือ",
  family: "ครอบครัว",
  other: "อื่นๆ",
};

export function AddPhotoDialog({ visitId, schoolId }: { visitId: string; schoolId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [category, setCategory] = useState("house");
  const [caption, setCaption] = useState("");

  async function handleSubmit() {
    if (!photoUrl.trim()) {
      toast.error("กรุณาระบุ URL รูปภาพ");
      return;
    }
    setIsSubmitting(true);
    const res = await fetch(`/api/home-visits/${visitId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, photoUrl: photoUrl.trim(), category, caption: caption.trim() || undefined }),
    });
    const json = await res.json();
    setIsSubmitting(false);
    if (!json.success) {
      toast.error("เพิ่มรูปภาพไม่สำเร็จ", { description: json.message });
      return;
    }
    toast.success("เพิ่มรูปภาพสำเร็จ");
    setOpen(false);
    setPhotoUrl("");
    setCaption("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ImagePlus className="h-4 w-4" />
          เพิ่มรูปภาพ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มรูปภาพการเยี่ยมบ้าน</DialogTitle>
          <DialogDescription>ระบุ URL ของรูปภาพที่อัปโหลดไว้แล้ว</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="URL รูปภาพ" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="คำอธิบายภาพ (ถ้ามี)" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "เพิ่มรูปภาพ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
