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

type LogType = "inspection" | "hygiene" | "equipment_maintenance" | "temperature" | "cleaning_schedule";
type Result = "pass" | "fail" | "needs_attention";

const logTypeOptions: { value: LogType; label: string }[] = [
  { value: "inspection", label: "ตรวจสอบ" },
  { value: "hygiene", label: "สุขลักษณะ" },
  { value: "equipment_maintenance", label: "บำรุงอุปกรณ์" },
  { value: "temperature", label: "ควบคุมอุณหภูมิ" },
  { value: "cleaning_schedule", label: "ตารางทำความสะอาด" },
];

export function FoodSafetyLogFormDialog({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logType, setLogType] = useState<LogType>("inspection");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<Result | "">("");
  const [temperatureCelsius, setTemperatureCelsius] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    if (!subject.trim()) {
      toast.error("กรุณากรอกหัวข้อ");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("food_safety_logs").insert({
      school_id: schoolId,
      log_type: logType,
      log_date: logDate,
      subject,
      result: result || null,
      temperature_celsius: temperatureCelsius ? Number(temperatureCelsius) : null,
      notes: notes.trim() || null,
    });
    setIsSubmitting(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
      return;
    }
    toast.success("บันทึกความปลอดภัยอาหารสำเร็จ");
    setOpen(false);
    setSubject("");
    setResult("");
    setTemperatureCelsius("");
    setNotes("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มบันทึก
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มบันทึกความปลอดภัยอาหาร</DialogTitle>
          <DialogDescription>บันทึกผลการตรวจสอบ สุขลักษณะ อุณหภูมิ หรือการบำรุงอุปกรณ์</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={logType} onValueChange={(v) => setLogType(v as LogType)}>
            <SelectTrigger>
              <SelectValue placeholder="ประเภท" />
            </SelectTrigger>
            <SelectContent>
              {logTypeOptions.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">วันที่</label>
            <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
          </div>
          <Input placeholder="หัวข้อ" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Select value={result} onValueChange={(v) => setResult(v as Result)}>
            <SelectTrigger>
              <SelectValue placeholder="ผลลัพธ์ (ไม่บังคับ)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">ผ่าน</SelectItem>
              <SelectItem value="fail">ไม่ผ่าน</SelectItem>
              <SelectItem value="needs_attention">ต้องติดตาม</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="อุณหภูมิ (°C, ไม่บังคับ)"
            type="number"
            value={temperatureCelsius}
            onChange={(e) => setTemperatureCelsius(e.target.value)}
          />
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
