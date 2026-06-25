"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Upload } from "lucide-react";

const CATEGORIES = [
  { value: "attendance", label: "การเข้าเรียน" },
  { value: "milk", label: "นม" },
  { value: "lunch", label: "อาหารกลางวัน" },
  { value: "academic", label: "วิชาการ" },
  { value: "behavior", label: "พฤติกรรม" },
  { value: "health", label: "สุขภาพ" },
  { value: "bmi", label: "BMI" },
  { value: "home_visit", label: "เยี่ยมบ้าน" },
  { value: "sdq", label: "SDQ" },
  { value: "finance", label: "การเงิน" },
  { value: "savings", label: "เงินฝาก" },
  { value: "certificate", label: "ใบประกาศ" },
  { value: "report_card", label: "สมุดพก" },
  { value: "pta_meeting", label: "ประชุมผู้ปกครอง" },
  { value: "official_letter", label: "หนังสือราชการ" },
  { value: "government_form", label: "แบบฟอร์มราชการ" },
  { value: "custom", label: "อื่นๆ" },
];

export function TemplateUploadDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !category || !file) {
      toast.error("กรุณากรอกชื่อ หมวดหมู่ และเลือกไฟล์ .docx");
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("category", category);
    formData.append("file", file);

    const res = await fetch("/api/documents/templates", { method: "POST", body: formData });
    const data = await res.json();
    setIsSubmitting(false);

    if (!res.ok) {
      toast.error("อัปโหลดเทมเพลตล้มเหลว", { description: data.error });
      return;
    }

    toast.success(`อัปโหลดสำเร็จ ตรวจพบ ${data.template.fields.length} ฟิลด์`);
    setOpen(false);
    setName("");
    setDescription("");
    setCategory("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          อัปโหลดเทมเพลต
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>อัปโหลดเทมเพลตใหม่</DialogTitle>
          <DialogDescription>
            อัปโหลดไฟล์ Word (.docx) ที่มีฟิลด์ในรูปแบบ {`{{placeholder}}`} เช่น {`{{student.full_name}}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>ชื่อเทมเพลต</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น หนังสือรับรองนักเรียน" />
          </div>
          <div className="space-y-1.5">
            <Label>คำอธิบาย (ไม่บังคับ)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>หมวดหมู่</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ไฟล์ .docx</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังอัปโหลด..." : "อัปโหลด"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
