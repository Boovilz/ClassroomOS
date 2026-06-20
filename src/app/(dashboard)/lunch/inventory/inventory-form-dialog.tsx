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
import { Plus } from "lucide-react";

interface SupplierOption {
  id: string;
  name: string;
}

type Category = "ingredient" | "supply" | "kitchen_material";

export function InventoryFormDialog({ schoolId, suppliers }: { schoolId: string; suppliers: SupplierOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<Category>("ingredient");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("กก.");
  const [reorderLevel, setReorderLevel] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setItemName("");
    setCategory("ingredient");
    setQuantity("");
    setUnit("กก.");
    setReorderLevel("");
    setPurchaseDate("");
    setExpirationDate("");
    setSupplierId("");
    setUnitCost("");
    setNotes("");
  }

  async function handleSubmit() {
    if (!itemName.trim()) {
      toast.error("กรุณากรอกชื่อวัตถุดิบ");
      return;
    }
    setIsSubmitting(true);

    const res = await fetch("/api/inventory/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        itemName,
        category,
        quantity: quantity ? Number(quantity) : undefined,
        unit,
        reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
        purchaseDate: purchaseDate || undefined,
        expirationDate: expirationDate || undefined,
        supplierId: supplierId || undefined,
        unitCost: unitCost ? Number(unitCost) : undefined,
        notes: notes.trim() || undefined,
      }),
    });
    const data = await res.json();
    setIsSubmitting(false);

    if (!data.success) {
      toast.error("เพิ่มวัตถุดิบไม่สำเร็จ", { description: data.message });
      return;
    }

    toast.success("เพิ่มวัตถุดิบสำเร็จ");
    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มวัตถุดิบ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มวัตถุดิบ/วัสดุครัว</DialogTitle>
          <DialogDescription>กรอกข้อมูลรายการวัตถุดิบใหม่เข้าคลัง</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="ชื่อวัตถุดิบ" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger>
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ingredient">วัตถุดิบ</SelectItem>
              <SelectItem value="supply">วัสดุสิ้นเปลือง</SelectItem>
              <SelectItem value="kitchen_material">วัสดุครัว</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="จำนวน" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Input placeholder="หน่วย (กก./ลิตร/ชิ้น)" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <Input placeholder="จุดสั่งซื้อซ้ำ (reorder level)" type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">วันที่ซื้อ</label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">วันหมดอายุ</label>
              <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            </div>
          </div>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="ผู้จำหน่าย (ไม่บังคับ)" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="ต้นทุนต่อหน่วย (บาท)" type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          <Textarea placeholder="หมายเหตุ (ไม่บังคับ)" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
