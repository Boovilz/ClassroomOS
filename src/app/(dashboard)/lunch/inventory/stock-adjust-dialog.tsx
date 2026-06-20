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
import { PackageOpen } from "lucide-react";

type TxnType = "add" | "remove" | "adjust" | "transfer" | "audit";

const txnTypeOptions: { value: TxnType; label: string }[] = [
  { value: "add", label: "รับเข้า" },
  { value: "remove", label: "เบิกออก" },
  { value: "adjust", label: "ปรับปรุง" },
  { value: "transfer", label: "โอนย้าย" },
  { value: "audit", label: "ตรวจนับ" },
];

export function StockAdjustDialog({ schoolId, inventoryId, itemName }: { schoolId: string; inventoryId: string; itemName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txnType, setTxnType] = useState<TxnType>("add");
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("");

  async function handleSubmit() {
    const value = Number(quantityChange);
    if (!quantityChange.trim() || Number.isNaN(value) || value === 0) {
      toast.error("กรุณากรอกจำนวนที่เปลี่ยนแปลง");
      return;
    }
    const signedChange = txnType === "remove" ? -Math.abs(value) : value;
    setIsSubmitting(true);

    const res = await fetch("/api/inventory/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        inventoryId,
        txnType,
        quantityChange: signedChange,
        reason: reason.trim() || undefined,
      }),
    });
    const data = await res.json();
    setIsSubmitting(false);

    if (!data.success) {
      toast.error("ปรับสต็อกไม่สำเร็จ", { description: data.message });
      return;
    }

    toast.success("ปรับสต็อกสำเร็จ");
    setOpen(false);
    setQuantityChange("");
    setReason("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PackageOpen className="h-4 w-4" />
          ปรับสต็อก
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ปรับสต็อก: {itemName}</DialogTitle>
          <DialogDescription>บันทึกการรับเข้า เบิกออก หรือปรับปรุงจำนวนคงเหลือ</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={txnType} onValueChange={(v) => setTxnType(v as TxnType)}>
            <SelectTrigger>
              <SelectValue placeholder="ประเภทรายการ" />
            </SelectTrigger>
            <SelectContent>
              {txnTypeOptions.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="จำนวนที่เปลี่ยนแปลง"
            type="number"
            value={quantityChange}
            onChange={(e) => setQuantityChange(e.target.value)}
          />
          <Input placeholder="เหตุผล/หมายเหตุ (ไม่บังคับ)" value={reason} onChange={(e) => setReason(e.target.value)} />
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
