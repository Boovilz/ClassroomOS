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
import { Plus, Trash2, ClipboardList } from "lucide-react";
import type { RubricCriterion } from "@/lib/supabase/types";

interface SubjectOption {
  id: string;
  name: string;
}

const EMPTY_CRITERION: RubricCriterion = {
  name: "",
  levels: [
    { label: "ดีเยี่ยม", points: 4 },
    { label: "ดี", points: 3 },
    { label: "พอใช้", points: 2 },
    { label: "ปรับปรุง", points: 1 },
  ],
};

export function RubricBuilder({ subjects }: { subjects: SubjectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState<RubricCriterion[]>([structuredClone(EMPTY_CRITERION)]);

  function addCriterion() {
    setCriteria((prev) => [...prev, structuredClone(EMPTY_CRITERION)]);
  }

  function removeCriterion(index: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCriterionName(index: number, name: string) {
    setCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, name } : c)));
  }

  function updateLevel(criterionIndex: number, levelIndex: number, field: "label" | "points", value: string) {
    setCriteria((prev) =>
      prev.map((c, i) => {
        if (i !== criterionIndex) return c;
        const levels = c.levels.map((l, li) =>
          li === levelIndex ? { ...l, [field]: field === "points" ? Number(value) || 0 : value } : l
        );
        return { ...c, levels };
      })
    );
  }

  async function handleSubmit() {
    if (!subjectId || !title.trim() || criteria.some((c) => !c.name.trim())) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, title, criteria }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "เกิดข้อผิดพลาด");
      toast.success("สร้างเกณฑ์การประเมินสำเร็จ");
      setOpen(false);
      setTitle("");
      setSubjectId("");
      setCriteria([structuredClone(EMPTY_CRITERION)]);
      router.refresh();
    } catch (error) {
      toast.error("สร้างเกณฑ์การประเมินไม่สำเร็จ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ClipboardList className="h-4 w-4" />
          สร้างเกณฑ์การประเมิน (Rubric)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สร้างเกณฑ์การประเมิน</DialogTitle>
          <DialogDescription>กำหนดเกณฑ์ (criteria) และระดับคะแนน (levels) สำหรับการประเมินแบบ Rubric</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกวิชา" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="ชื่อเกณฑ์การประเมิน" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="space-y-3">
            {criteria.map((criterion, ci) => (
              <div key={ci} className="rounded-xl border border-border/60 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={`เกณฑ์ที่ ${ci + 1} (เช่น ความถูกต้องของเนื้อหา)`}
                    value={criterion.name}
                    onChange={(e) => updateCriterionName(ci, e.target.value)}
                  />
                  {criteria.length > 1 && (
                    <Button variant="outline" size="icon" onClick={() => removeCriterion(ci)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {criterion.levels.map((level, li) => (
                    <div key={li} className="space-y-1">
                      <Input
                        placeholder="ระดับ"
                        value={level.label}
                        onChange={(e) => updateLevel(ci, li, "label", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="คะแนน"
                        value={level.points}
                        onChange={(e) => updateLevel(ci, li, "points", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="gap-2" onClick={addCriterion}>
            <Plus className="h-4 w-4" />
            เพิ่มเกณฑ์
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกเกณฑ์การประเมิน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
