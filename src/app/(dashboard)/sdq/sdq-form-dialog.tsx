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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface StudentOption {
  id: string;
  full_name: string;
  student_code: string;
}

function riskFromTotal(total: number): "normal" | "borderline" | "abnormal" {
  if (total <= 13) return "normal";
  if (total <= 16) return "borderline";
  return "abnormal";
}

export function SdqFormDialog({ schoolId, students }: { schoolId: string; students: StudentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [emotional, setEmotional] = useState("0");
  const [conduct, setConduct] = useState("0");
  const [hyperactivity, setHyperactivity] = useState("0");
  const [peerProblems, setPeerProblems] = useState("0");
  const [prosocial, setProsocial] = useState("0");

  async function handleSubmit() {
    if (!studentId) {
      toast.error("กรุณาเลือกนักเรียน");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();

    const emotionalScore = Number(emotional) || 0;
    const conductScore = Number(conduct) || 0;
    const hyperactivityScore = Number(hyperactivity) || 0;
    const peerProblemsScore = Number(peerProblems) || 0;
    const prosocialScore = Number(prosocial) || 0;
    const total = emotionalScore + conductScore + hyperactivityScore + peerProblemsScore;

    const { error } = await supabase.from("sdq_assessments").insert({
      school_id: schoolId,
      student_id: studentId,
      assessed_by: auth.user?.id,
      assessment_date: new Date().toISOString().slice(0, 10),
      emotional_score: emotionalScore,
      conduct_score: conductScore,
      hyperactivity_score: hyperactivityScore,
      peer_problems_score: peerProblemsScore,
      prosocial_score: prosocialScore,
      total_difficulties_score: total,
      risk_level: riskFromTotal(total),
    });

    setIsSubmitting(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("บันทึกผลการประเมินสำเร็จ");
    setOpen(false);
    setEmotional("0");
    setConduct("0");
    setHyperactivity("0");
    setPeerProblems("0");
    setProsocial("0");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          ประเมินใหม่
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แบบประเมิน SDQ</DialogTitle>
          <DialogDescription>กรอกคะแนนแต่ละด้าน (0-10) ระบบจะคำนวณคะแนนรวมและระดับความเสี่ยงอัตโนมัติ</DialogDescription>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">อารมณ์</label>
              <Input type="number" min={0} max={10} value={emotional} onChange={(e) => setEmotional(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ความประพฤติ</label>
              <Input type="number" min={0} max={10} value={conduct} onChange={(e) => setConduct(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ซน/ไม่อยู่นิ่ง</label>
              <Input type="number" min={0} max={10} value={hyperactivity} onChange={(e) => setHyperactivity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ปัญหากับเพื่อน</label>
              <Input type="number" min={0} max={10} value={peerProblems} onChange={(e) => setPeerProblems(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">สัมพันธภาพทางสังคม</label>
              <Input type="number" min={0} max={10} value={prosocial} onChange={(e) => setProsocial(e.target.value)} />
            </div>
          </div>
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
