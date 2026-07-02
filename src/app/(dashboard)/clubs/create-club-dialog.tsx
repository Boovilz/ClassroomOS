"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export function CreateClubDialog({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("กรุณากรอกชื่อชุมนุม");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          name: name.trim(),
          description: description.trim() || undefined,
          maxMembers: maxMembers ? parseInt(maxMembers, 10) : undefined,
          academicYear: academicYear || undefined,
          semester: semester ? parseInt(semester, 10) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message ?? "สร้างชุมนุมไม่สำเร็จ");
      toast.success("สร้างชุมนุมสำเร็จ");
      setOpen(false);
      setName("");
      setDescription("");
      setMaxMembers("");
      setAcademicYear("");
      setSemester("");
      router.refresh();
    } catch (err) {
      toast.error("สร้างชุมนุมไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          สร้างชุมนุมใหม่
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สร้างชุมนุมใหม่</DialogTitle>
          <DialogDescription>กรอกข้อมูลชุมนุมหรือกิจกรรมพิเศษที่ต้องการสร้าง</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="club-name">ชื่อชุมนุม *</Label>
            <Input
              id="club-name"
              placeholder="เช่น ชุมนุมดนตรี, ชุมนุมวิทยาศาสตร์"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="club-desc">คำอธิบาย</Label>
            <Textarea
              id="club-desc"
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับชุมนุม..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="max-members">จำนวนสมาชิกสูงสุด</Label>
              <Input
                id="max-members"
                type="number"
                min={1}
                placeholder="ไม่จำกัด"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="academic-year">ปีการศึกษา</Label>
              <Input
                id="academic-year"
                placeholder="เช่น 2567"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="semester">ภาคเรียน</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger id="semester">
                <SelectValue placeholder="เลือกภาคเรียน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">ภาคเรียนที่ 1</SelectItem>
                <SelectItem value="2">ภาคเรียนที่ 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังสร้าง..." : "สร้างชุมนุม"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
