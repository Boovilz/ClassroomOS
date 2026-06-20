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
import { Plus } from "lucide-react";

interface SupplierOption {
  id: string;
  name: string;
}

export function PurchaseOrderFormDialog({ schoolId, suppliers }: { schoolId: string; suppliers: SupplierOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [itemSummary, setItemSummary] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    if (!supplierId) {
      toast.error("กรุณาเลือกผู้จำหน่าย");
      return;
    }
    if (!totalAmount.trim() || Number.isNaN(Number(totalAmount))) {
      toast.error("กรุณากรอกยอดรวมที่ถูกต้อง");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const orderNo = `PO-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("purchase_orders").insert({
      school_id: schoolId,
      supplier_id: supplierId,
      order_no: orderNo,
      item_summary: itemSummary.trim() || null,
      total_amount: Number(totalAmount),
      status: "draft",
      expected_delivery_date: expectedDeliveryDate || null,
      notes: notes.trim() || null,
    });
    setIsSubmitting(false);
    if (error) {
      toast.error("สร้างใบสั่งซื้อไม่สำเร็จ", { description: error.message });
      return;
    }
    toast.success("สร้างใบสั่งซื้อสำเร็จ");
    setOpen(false);
    setSupplierId("");
    setItemSummary("");
    setTotalAmount("");
    setExpectedDeliveryDate("");
    setNotes("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          สร้างใบสั่งซื้อ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สร้างใบสั่งซื้อ</DialogTitle>
          <DialogDescription>กรอกข้อมูลใบสั่งซื้อวัตถุดิบกับผู้จำหน่าย</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกผู้จำหน่าย" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="สรุปรายการสั่งซื้อ" value={itemSummary} onChange={(e) => setItemSummary(e.target.value)} />
          <Input placeholder="ยอดรวม (บาท)" type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">กำหนดส่งมอบ</label>
            <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
          </div>
          <Input placeholder="หมายเหตุ (ไม่บังคับ)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "สร้างใบสั่งซื้อ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
