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
import { Plus } from "lucide-react";

export function SupplierFormDialog({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("กรุณากรอกชื่อผู้จำหน่าย");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("food_suppliers").insert({
      school_id: schoolId,
      name,
      contact_name: contactName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
    });
    setIsSubmitting(false);
    if (error) {
      toast.error("เพิ่มผู้จำหน่ายไม่สำเร็จ", { description: error.message });
      return;
    }
    toast.success("เพิ่มผู้จำหน่ายสำเร็จ");
    setOpen(false);
    setName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setAddress("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มผู้จำหน่าย
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มผู้จำหน่าย</DialogTitle>
          <DialogDescription>กรอกข้อมูลผู้จำหน่ายวัตถุดิบ</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="ชื่อผู้จำหน่าย" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="ชื่อผู้ติดต่อ" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <Input placeholder="โทรศัพท์" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="ที่อยู่" value={address} onChange={(e) => setAddress(e.target.value)} />
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
