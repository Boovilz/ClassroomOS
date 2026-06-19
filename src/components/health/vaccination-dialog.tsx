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
import { Syringe } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

const VACCINE_OPTIONS = ["BCG", "HBV", "DTP", "MMR", "Polio", "COVID-19", "Influenza", "อื่นๆ"];

export function VaccinationDialog({ schoolId, students, userId }: { schoolId: string; students: StudentOption[]; userId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [customVaccine, setCustomVaccine] = useState("");
  const [doseNumber, setDoseNumber] = useState("1");
  const [administeredAt, setAdministeredAt] = useState("");
  const [nextDueAt, setNextDueAt] = useState("");
  const [hospital, setHospital] = useState("");

  async function handleSubmit() {
    const name = vaccineName === "อื่นๆ" ? customVaccine.trim() : vaccineName;
    if (!studentId || !name) {
      toast.error("กรุณาเลือกนักเรียนและระบุชื่อวัคซีน");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/health/vaccination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          studentId,
          vaccineName: name,
          doseNumber: Number(doseNumber) || 1,
          administeredAt: administeredAt || undefined,
          nextDueAt: nextDueAt || undefined,
          hospital: hospital || undefined,
          recordedBy: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error("บันทึกไม่สำเร็จ", { description: data.message });
        return;
      }
      toast.success("บันทึกการฉีดวัคซีนสำเร็จ");
      setOpen(false);
      setStudentId("");
      setVaccineName("");
      setCustomVaccine("");
      setDoseNumber("1");
      setAdministeredAt("");
      setNextDueAt("");
      setHospital("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Syringe className="h-4 w-4" />
          บันทึกวัคซีน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกการฉีดวัคซีน</DialogTitle>
          <DialogDescription>ติดตามวัคซีนของนักเรียนและกำหนดวันนัดครั้งต่อไป</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกนักเรียน" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.student_code} - {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vaccineName} onValueChange={setVaccineName}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกวัคซีน" />
            </SelectTrigger>
            <SelectContent>
              {VACCINE_OPTIONS.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {vaccineName === "อื่นๆ" && (
            <Input placeholder="ระบุชื่อวัคซีน" value={customVaccine} onChange={(e) => setCustomVaccine(e.target.value)} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" min={1} placeholder="เข็มที่" value={doseNumber} onChange={(e) => setDoseNumber(e.target.value)} />
            <Input placeholder="สถานพยาบาล" value={hospital} onChange={(e) => setHospital(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">วันที่ฉีด</label>
              <Input type="date" value={administeredAt} onChange={(e) => setAdministeredAt(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">นัดครั้งต่อไป</label>
              <Input type="date" value={nextDueAt} onChange={(e) => setNextDueAt(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
