"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Status = "draft" | "ordered" | "delivered" | "invoiced" | "paid" | "cancelled";

const statusOptions: { value: Status; label: string }[] = [
  { value: "draft", label: "ร่าง" },
  { value: "ordered", label: "สั่งซื้อแล้ว" },
  { value: "delivered", label: "ได้รับแล้ว" },
  { value: "invoiced", label: "ออกใบแจ้งหนี้แล้ว" },
  { value: "paid", label: "ชำระเงินแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

export function PurchaseOrderStatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>((currentStatus as Status) ?? "draft");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleChange(value: Status) {
    setStatus(value);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/lunch/purchase-order/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: value }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error("อัปเดตสถานะไม่สำเร็จ", { description: data.message });
        return;
      }
      toast.success("อัปเดตสถานะสำเร็จ");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Select value={status} onValueChange={(v) => handleChange(v as Status)} disabled={isSubmitting}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
