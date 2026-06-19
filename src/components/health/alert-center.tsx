"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface AlertRow {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  students: { full_name: string; student_code: string; classroom: string | null } | null;
}

const severityVariant: Record<string, "destructive" | "secondary" | "outline" | "success"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const severityLabel: Record<string, string> = {
  critical: "วิกฤต",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
};

export function AlertCenter({ alerts, approverId }: { alerts: AlertRow[]; approverId?: string }) {
  const router = useRouter();

  async function handleResolve(alertId: string) {
    const res = await fetch("/api/health/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, resolvedBy: approverId }),
    });
    if (!res.ok) {
      toast.error("ไม่สามารถอัปเดตการแจ้งเตือนได้");
      return;
    }
    toast.success("รับทราบการแจ้งเตือนแล้ว");
    router.refresh();
  }

  if (alerts.length === 0) {
    return <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือนด้านสุขภาพในขณะนี้</p>;
  }

  return (
    <div className="space-y-3">
      {alerts.map((a) => {
        const student = Array.isArray(a.students) ? a.students[0] : a.students;
        return (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Badge variant={severityVariant[a.severity] ?? "outline"}>{severityLabel[a.severity] ?? a.severity}</Badge>
                {student && (
                  <span className="text-xs text-muted-foreground">
                    {student.full_name} ({student.student_code}) {student.classroom ? `- ${student.classroom}` : ""}
                  </span>
                )}
              </div>
              <p className="text-sm">{a.message}</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleResolve(a.id)}>
              <CheckCircle2 className="h-4 w-4" />
              รับทราบ
            </Button>
          </div>
        );
      })}
    </div>
  );
}
