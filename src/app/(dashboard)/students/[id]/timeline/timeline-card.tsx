"use client";

import { useState } from "react";
import Link from "next/link";
import type { TimelineEvent } from "@/app/api/students/[id]/timeline/route";
import { COLOR_MAP } from "./timeline-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock } from "lucide-react";

const MODULE_LABEL: Record<string, string> = {
  attendance:  "การเช็คชื่อ",
  grade:       "คะแนน",
  behavior:    "พฤติกรรม",
  health:      "สุขภาพ",
  home_visit:  "เยี่ยมบ้าน",
  savings:     "ออมทรัพย์",
  lunch:       "อาหารกลางวัน",
  eq:          "EQ",
  sdq:         "SDQ",
  certificate: "เกียรติบัตร",
  document:    "เอกสาร",
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  if (dateStr.length <= 10) return "";
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function MetaRows({ meta }: { meta: Record<string, unknown> }) {
  const rows = Object.entries(meta).filter(([, v]) => v != null && v !== "");
  if (rows.length === 0) return null;
  const labelMap: Record<string, string> = {
    points: "คะแนน", category: "หมวด", check_in_time: "เวลาเข้า",
    score: "คะแนน", max_score: "คะแนนเต็ม", pct: "เปอร์เซ็นต์", term: "เทอม", subject: "วิชา", subject_code: "รหัสวิชา",
    amount: "จำนวน", balance_after: "ยอดคงเหลือ", reward_item_id: "รางวัล",
    height_cm: "ส่วนสูง (ซม.)", weight_kg: "น้ำหนัก (กก.)", bmi: "BMI", nutrition_status: "สถานะโภชนาการ",
    status: "สถานะ", outcome: "ผลลัพธ์", meal_type: "ประเภทมื้อ", notes: "หมายเหตุ",
    total: "คะแนนรวม", self_awareness: "การตระหนักรู้ตนเอง", self_regulation: "การควบคุมอารมณ์",
    motivation: "แรงจูงใจ", empathy: "เข้าใจผู้อื่น", social_skills: "ทักษะสังคม",
    total_score: "คะแนน SDQ", risk_level: "ระดับความเสี่ยง",
  };
  return (
    <div className="mt-3 rounded-xl bg-muted/40 divide-y text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between px-3 py-1.5">
          <span className="text-muted-foreground">{labelMap[k] ?? k}</span>
          <span className="font-medium">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

export function TimelineCard({ event, studentId }: { event: TimelineEvent; studentId: string }) {
  const [open, setOpen] = useState(false);
  const colorClass = COLOR_MAP[event.color] ?? COLOR_MAP.gray;
  const time = formatTime(event.event_date);
  const moduleLabel = MODULE_LABEL[event.module] ?? event.module;

  return (
    <>
      {/* Timeline dot */}
      <div className="relative ml-6">
        <div className={`absolute -left-[1.85rem] top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background text-xs ${colorClass}`}>
          {event.icon}
        </div>

        <button
          onClick={() => setOpen(true)}
          className={`w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${colorClass}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal border-current/30">
                  {moduleLabel}
                </Badge>
                {time && (
                  <span className="flex items-center gap-0.5 text-[10px] text-current/70">
                    <Clock className="h-2.5 w-2.5" />{time}
                  </span>
                )}
              </div>
              <p className="font-semibold leading-snug truncate">{event.title}</p>
              {event.description && (
                <p className="mt-0.5 text-xs opacity-80 line-clamp-2">{event.description}</p>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Detail Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-lg border ${colorClass}`}>{event.icon}</span>
              <span className="truncate">{event.title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{moduleLabel}</Badge>
              <Badge variant="outline" className="font-normal">
                {new Date(event.event_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", calendar: "buddhist" })}
                {time ? ` ${time}` : ""}
              </Badge>
            </div>

            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}

            <MetaRows meta={event.meta} />

            {event.created_by && (
              <p className="text-xs text-muted-foreground">ผู้บันทึก: {event.created_by}</p>
            )}

            {event.source_url && (
              <Button asChild variant="outline" size="sm" className="w-full gap-2">
                <Link href={event.source_url}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  ดูข้อมูลต้นทาง
                </Link>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
