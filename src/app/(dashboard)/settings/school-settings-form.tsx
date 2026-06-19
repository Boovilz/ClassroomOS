"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface School {
  id: string;
  name: string;
  name_en: string | null;
  address: string | null;
  province: string | null;
  phone: string | null;
}

export function SchoolSettingsForm({ school, readOnly }: { school: School; readOnly: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(school.name);
  const [nameEn, setNameEn] = useState(school.name_en ?? "");
  const [address, setAddress] = useState(school.address ?? "");
  const [province, setProvince] = useState(school.province ?? "");
  const [phone, setPhone] = useState(school.phone ?? "");

  async function handleSave() {
    if (!name.trim()) {
      toast.error("กรุณากรอกชื่อโรงเรียน");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("schools")
      .update({
        name: name.trim(),
        name_en: nameEn.trim() || null,
        address: address.trim() || null,
        province: province.trim() || null,
        phone: phone.trim() || null,
      })
      .eq("id", school.id);

    setIsSubmitting(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("บันทึกข้อมูลโรงเรียนสำเร็จ");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">ชื่อโรงเรียน</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">ชื่อภาษาอังกฤษ</label>
        <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} disabled={readOnly} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label className="text-xs text-muted-foreground">ที่อยู่</label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={readOnly} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">จังหวัด</label>
        <Input value={province} onChange={(e) => setProvince(e.target.value)} disabled={readOnly} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">เบอร์โทรศัพท์</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={readOnly} />
      </div>
      {!readOnly && (
        <div className="sm:col-span-2">
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </div>
      )}
    </div>
  );
}
