"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const WORKFLOWS = [
  { kind: "daily_attendance_summary", label: "สรุปการมาเรียนประจำวัน" },
  { kind: "risk_alert_sweep", label: "ตรวจสอบนักเรียนกลุ่มเสี่ยง" },
  { kind: "parent_notification_batch", label: "สรุปการแจ้งเตือนผู้ปกครอง" },
  { kind: "health_monitoring_sweep", label: "เฝ้าระวังสุขภาพนักเรียน" },
] as const;

/**
 * Manually-triggered "run now" workflows - NOT a real scheduler/cron (no
 * background job runner in this Next.js app). Each run composes existing
 * query-layer functions and optionally calls Claude for a written
 * summary, persisted to ai_generated_content (content_type=workflow_run).
 */
export function AiWorkflowsPanel() {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { title: string; content: string }>>({});

  async function runWorkflow(kind: string) {
    setRunning(kind);
    try {
      const res = await fetch("/api/ai/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (data.success) {
        setResults((prev) => ({ ...prev, [kind]: { title: data.result.title, content: data.result.content } }));
      }
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        เวิร์กโฟลว์เหล่านี้เรียกใช้แบบ &quot;Run Now&quot; ด้วยมือเท่านั้น ระบบยังไม่มีตัวจัดการงานพื้นหลัง (background job scheduler) — สำหรับใช้งานจริงควรเชื่อมกับ cron
        ภายนอกที่เรียก API endpoint นี้ตามรอบเวลาที่ต้องการ
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {WORKFLOWS.map((w) => (
          <Card key={w.kind}>
            <CardHeader>
              <CardTitle className="text-base">{w.label}</CardTitle>
              <CardDescription>กดเพื่อรันทันทีและบันทึกผลสรุป</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => runWorkflow(w.kind)} disabled={running === w.kind} size="sm">
                {running === w.kind ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                รันตอนนี้
              </Button>
              {results[w.kind] && (
                <div className="rounded-lg border border-border/60 p-3 text-sm">
                  <p className="font-medium">{results[w.kind].title}</p>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{results[w.kind].content}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
