"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CsvExportButton, PrintButton } from "@/components/health/export-buttons";
import { ClipboardList } from "lucide-react";

interface SurveyRow {
  id: string;
  title: string;
  description: string | null;
  survey_type: "satisfaction" | "feedback" | "poll" | "vote";
  is_anonymous: boolean;
  status: "draft" | "open" | "closed";
  created_at: string;
}

const typeLabel: Record<string, string> = {
  satisfaction: "ความพึงพอใจ",
  feedback: "แบบสอบถาม",
  poll: "โพล",
  vote: "การลงคะแนน",
};
const statusLabel: Record<string, string> = { draft: "แบบร่าง", open: "เปิดรับคำตอบ", closed: "ปิดแล้ว" };

export function SurveysPanel({ schoolId, surveys }: { schoolId: string; surveys: SurveyRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !questionText.trim()) {
      toast.error("กรุณากรอกชื่อแบบสำรวจและคำถามอย่างน้อย 1 ข้อ");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          title,
          description,
          surveyType: "feedback",
          isAnonymous,
          questions: [{ questionText, questionType: "rating" }],
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("สร้างแบบสำรวจสำเร็จ");
      setOpen(false);
      setTitle("");
      setDescription("");
      setQuestionText("");
      router.refresh();
    } catch (err) {
      toast.error("สร้างไม่สำเร็จ", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">แบบสำรวจ / โพล / ความพึงพอใจ</h3>
        <div className="flex gap-2">
          <CsvExportButton
            filename="surveys.csv"
            headers={["ชื่อแบบสำรวจ", "ประเภท", "สถานะ", "วันที่สร้าง"]}
            rows={surveys.map((s) => [s.title, typeLabel[s.survey_type], statusLabel[s.status], new Date(s.created_at).toLocaleDateString("th-TH")])}
          />
          <PrintButton />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <ClipboardList className="h-4 w-4" />
                สร้างแบบสำรวจ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>สร้างแบบสำรวจใหม่</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="ชื่อแบบสำรวจ" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea placeholder="รายละเอียด" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                <Input placeholder="คำถาม (เช่น ความพึงพอใจต่อการสื่อสารของโรงเรียน)" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                  อนุญาตให้ตอบแบบไม่ระบุชื่อ
                </label>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "กำลังสร้าง..." : "สร้างแบบสำรวจ"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2 print:block">
        {surveys.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีแบบสำรวจ</CardContent>
          </Card>
        ) : (
          surveys.map((s) => (
            <Card key={s.id} className="glass-card">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Badge variant="secondary">{typeLabel[s.survey_type]}</Badge>
                  <Badge variant={s.status === "open" ? "success" : "outline"}>{statusLabel[s.status]}</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
