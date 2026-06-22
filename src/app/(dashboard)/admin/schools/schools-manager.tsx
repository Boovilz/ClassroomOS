"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { PLAN_LABEL_TH } from "@/lib/admin/quotas";

/** Create-school dialog, calling the super_admin-only /api/admin/schools endpoint. */
export function SchoolsManager() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [plan, setPlan] = useState("free");

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("ต้องระบุชื่อโรงเรียน");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, province, plan }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("สร้างโรงเรียนไม่สำเร็จ", { description: body.error });
      return;
    }
    toast.success("สร้างโรงเรียนใหม่แล้ว");
    setOpen(false);
    setName("");
    setProvince("");
    router.refresh();
  }

  return (
    <div className="flex justify-end">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> เพิ่มโรงเรียนใหม่
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มโรงเรียนใหม่</DialogTitle>
            <DialogDescription>ระบุข้อมูลพื้นฐานของโรงเรียน สามารถแก้ไขเพิ่มเติมได้ภายหลัง</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">ชื่อโรงเรียน</Label>
              <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-province">จังหวัด</Label>
              <Input id="school-province" value={province} onChange={(e) => setProvince(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>แพ็กเกจ</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAN_LABEL_TH).map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={busy}>
              {busy ? "กำลังสร้าง..." : "สร้างโรงเรียน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
