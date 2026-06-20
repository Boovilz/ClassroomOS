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
import { Plus, Trash2 } from "lucide-react";

type Category = "rice" | "noodle" | "soup" | "dessert" | "fruit" | "milk";

interface ItemDraft {
  name: string;
  category: Category;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  costPerServing: string;
}

const categoryOptions: { value: Category; label: string }[] = [
  { value: "rice", label: "อาหารจานข้าว" },
  { value: "noodle", label: "อาหารเส้น" },
  { value: "soup", label: "ซุป/แกง" },
  { value: "dessert", label: "ของหวาน" },
  { value: "fruit", label: "ผลไม้" },
  { value: "milk", label: "นม" },
];

function emptyItem(): ItemDraft {
  return { name: "", category: "rice", calories: "", proteinG: "", carbsG: "", fatG: "", costPerServing: "" };
}

export function MenuFormDialog({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [menuDate, setMenuDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "snack">("lunch");
  const [planScope, setPlanScope] = useState<"daily" | "weekly" | "monthly" | "semester">("daily");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("กรุณากรอกชื่อเมนู");
      return;
    }
    setIsSubmitting(true);

    const res = await fetch("/api/lunch/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        name,
        menuDate,
        mealType,
        planScope,
        description,
        items: items
          .filter((it) => it.name.trim())
          .map((it) => ({
            name: it.name,
            category: it.category,
            calories: it.calories ? Number(it.calories) : undefined,
            proteinG: it.proteinG ? Number(it.proteinG) : undefined,
            carbsG: it.carbsG ? Number(it.carbsG) : undefined,
            fatG: it.fatG ? Number(it.fatG) : undefined,
            costPerServing: it.costPerServing ? Number(it.costPerServing) : undefined,
          })),
      }),
    });
    const data = await res.json();
    setIsSubmitting(false);

    if (!data.success) {
      toast.error("สร้างเมนูไม่สำเร็จ", { description: data.message });
      return;
    }

    toast.success("สร้างเมนูสำเร็จ");
    setOpen(false);
    setName("");
    setDescription("");
    setItems([emptyItem()]);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          สร้างเมนูใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สร้างเมนูอาหาร</DialogTitle>
          <DialogDescription>กรอกข้อมูลเมนูและรายการอาหารแต่ละจาน พร้อมข้อมูลโภชนาการ</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="ชื่อเมนู" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            <Input type="date" value={menuDate} onChange={(e) => setMenuDate(e.target.value)} />
            <Select value={mealType} onValueChange={(v) => setMealType(v as typeof mealType)}>
              <SelectTrigger>
                <SelectValue placeholder="ประเภทอาหาร" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">อาหารเช้า</SelectItem>
                <SelectItem value="lunch">อาหารกลางวัน</SelectItem>
                <SelectItem value="snack">อาหารว่าง</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planScope} onValueChange={(v) => setPlanScope(v as typeof planScope)}>
              <SelectTrigger>
                <SelectValue placeholder="ช่วงเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">รายวัน</SelectItem>
                <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                <SelectItem value="monthly">รายเดือน</SelectItem>
                <SelectItem value="semester">รายภาคเรียน</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="คำอธิบายเมนู (ไม่บังคับ)" value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="space-y-3">
            <p className="text-sm font-medium">รายการอาหาร</p>
            {items.map((item, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex gap-2">
                  <Input placeholder="ชื่อจาน" value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                  <Select value={item.category} onValueChange={(v) => updateItem(idx, { category: v as Category })}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="แคลอรี่" type="number" value={item.calories} onChange={(e) => updateItem(idx, { calories: e.target.value })} />
                  <Input placeholder="โปรตีน (g)" type="number" value={item.proteinG} onChange={(e) => updateItem(idx, { proteinG: e.target.value })} />
                  <Input placeholder="คาร์บ (g)" type="number" value={item.carbsG} onChange={(e) => updateItem(idx, { carbsG: e.target.value })} />
                  <Input placeholder="ไขมัน (g)" type="number" value={item.fatG} onChange={(e) => updateItem(idx, { fatG: e.target.value })} />
                </div>
                <Input placeholder="ต้นทุนต่อหน่วย (บาท)" type="number" value={item.costPerServing} onChange={(e) => updateItem(idx, { costPerServing: e.target.value })} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
              <Plus className="mr-1 h-3 w-3" /> เพิ่มรายการอาหาร
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "สร้างเมนู"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
