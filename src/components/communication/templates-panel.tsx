"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

interface TemplateRow {
  id: string;
  template_type: string;
  title: string;
  body_template: string;
  is_active: boolean;
}

const typeLabel: Record<string, string> = {
  attendance_alert: "แจ้งเตือนการมาเรียน",
  late_arrival: "มาสาย",
  homework_reminder: "เตือนการบ้าน",
  exam_announcement: "ประกาศสอบ",
  behavior_update: "อัปเดตพฤติกรรม",
  parent_meeting_invitation: "เชิญประชุมผู้ปกครอง",
  emergency_notice: "ประกาศฉุกเฉิน",
  custom: "กำหนดเอง",
};

const draftTypeLabel: Record<string, string> = {
  homework_missing: "การบ้านที่ยังไม่ส่ง",
  meeting_invitation: "เชิญประชุมผู้ปกครอง",
  behavior_report: "รายงานพฤติกรรม",
  academic_summary: "สรุปผลการเรียน",
  attendance_concern: "ความกังวลเรื่องการมาเรียน",
};

export function TemplatesPanel({ templates }: { templates: TemplateRow[] }) {
  const [draftType, setDraftType] = useState("homework_missing");
  const [studentName, setStudentName] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);

  function handleGenerate() {
    if (!studentName.trim()) return;
    setGenerating(true);
    setDraft(buildDraft(draftType, { studentName, detail, date, time, location }));
    setGenerating(false);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">เทมเพลตข้อความ ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีเทมเพลต</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  <Badge variant="secondary">{typeLabel[t.template_type] ?? t.template_type}</Badge>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{t.body_template}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            ผู้ช่วยร่างข้อความ (กฎเกณฑ์สำเร็จรูป ไม่ใช่ AI ภายนอก)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={draftType} onValueChange={setDraftType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(draftTypeLabel).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="ชื่อนักเรียน" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
          <Input placeholder="รายละเอียดเพิ่มเติม" value={detail} onChange={(e) => setDetail(e.target.value)} />
          {draftType === "meeting_invitation" && (
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="วันที่" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input placeholder="เวลา" value={time} onChange={(e) => setTime(e.target.value)} />
              <Input placeholder="สถานที่" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          )}
          <Button onClick={handleGenerate} disabled={generating || !studentName.trim()}>
            {generating ? "กำลังร่าง..." : "ร่างข้อความ"}
          </Button>
          {draft && <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} />}
          <p className="text-[11px] text-muted-foreground">
            ข้อความร่างนี้สร้างจากกฎเกณฑ์/เทมเพลตภายในระบบเท่านั้น ไม่มีการเรียกใช้ AI ภายนอก (เช่น LLM API) แต่อย่างใด
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Local mirror of the server-side generateParentMessage() in
// src/lib/queries/communication.ts, kept here purely so this client
// component can render a live draft without a server round-trip for what
// is just rule-based string templating (no external call of any kind).
function buildDraft(
  type: string,
  context: { studentName: string; detail?: string; date?: string; time?: string; location?: string }
): string {
  switch (type) {
    case "homework_missing":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nทางโรงเรียนขอเรียนแจ้งว่า ${context.studentName} ยังไม่ได้ส่งงาน${context.detail ? ` "${context.detail}"` : ""} กรุณาติดตามและกระตุ้นให้บุตรหลานส่งงานโดยเร็ว หากมีข้อสงสัยสามารถติดต่อครูประจำชั้นได้\n\nขอบคุณค่ะ/ครับ`;
    case "meeting_invitation":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nขอเรียนเชิญท่านเข้าร่วมการประชุมผู้ปกครอง${context.date ? ` ในวันที่ ${context.date}` : ""}${context.time ? ` เวลา ${context.time} น.` : ""}${context.location ? ` ณ ${context.location}` : ""} เพื่อร่วมปรึกษาเรื่องการเรียนและพัฒนาการของบุตรหลาน\n\nหวังเป็นอย่างยิ่งว่าจะได้รับความร่วมมือจากท่าน`;
    case "behavior_report":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nทางโรงเรียนขอรายงานเกี่ยวกับพฤติกรรมของ ${context.studentName}: ${context.detail ?? "-"}\n\nขอความร่วมมือจากท่านในการดูแลและให้คำแนะนำเพิ่มเติมที่บ้าน`;
    case "academic_summary":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nสรุปผลการเรียนของ ${context.studentName}: ${context.detail ?? "-"}\n\nหากต้องการข้อมูลเพิ่มเติมหรือต้องการนัดพูดคุย กรุณาติดต่อครูประจำชั้น`;
    case "attendance_concern":
      return `เรียนผู้ปกครองของ ${context.studentName}\n\nทางโรงเรียนสังเกตว่า ${context.studentName} มีการขาด/ลา/มาสายบ่อยครั้งในช่วงที่ผ่านมา${context.detail ? ` (${context.detail})` : ""} จึงขอความร่วมมือจากท่านในการดูแลเรื่องการมาเรียนอย่างสม่ำเสมอ`;
    default:
      return `เรียนผู้ปกครองของ ${context.studentName}\n\n${context.detail ?? ""}`;
  }
}
