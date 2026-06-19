"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LiveRecord {
  id: string;
  student_id: string;
  status: string;
  check_in_time: string | null;
}

/**
 * Real-time present/late/absent counters, updated via Supabase Realtime
 * (`postgres_changes` on `attendance`). No precedent for Realtime elsewhere
 * in the codebase yet, so this wires the channel directly per the Supabase
 * docs pattern rather than introducing a shared hook prematurely.
 */
export function LiveAttendanceBoard({
  initialPresent,
  initialLate,
  initialAbsent,
  initialPending,
  totalStudents,
}: {
  initialPresent: number;
  initialLate: number;
  initialAbsent: number;
  initialPending: number;
  totalStudents: number;
}) {
  const [counts, setCounts] = useState({
    present: initialPresent,
    late: initialLate,
    absent: initialAbsent,
    pending: initialPending,
  });
  const [recentlyUpdated, setRecentlyUpdated] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);

    const channel = supabase
      .channel("attendance-live-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        (payload) => {
          const row = (payload.new ?? payload.old) as LiveRecord & { date?: string };
          if (!row || (row as { date?: string }).date !== today) return;

          setCounts((prev) => {
            const next = { ...prev };
            if (payload.eventType === "INSERT") {
              if (row.status === "present") next.present += 1;
              else if (row.status === "late") next.late += 1;
              else if (row.status === "absent") next.absent += 1;
              next.pending = Math.max(next.pending - 1, 0);
            }
            return next;
          });

          setRecentlyUpdated((prev) => [row.student_id, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [totalStudents]);

  const stats = [
    { label: "มาเรียน", value: counts.present, variant: "success" as const },
    { label: "มาสาย", value: counts.late, variant: "outline" as const },
    { label: "ขาดเรียน", value: counts.absent, variant: "destructive" as const },
    { label: "ยังไม่เช็คชื่อ", value: counts.pending, variant: "secondary" as const },
  ];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>กระดานเช็คชื่อสด</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl border border-border/60 p-3">
              <Badge variant={s.variant}>{s.label}</Badge>
              <span className="text-2xl font-bold">{s.value}</span>
            </div>
          ))}
        </div>
        {recentlyUpdated.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">อัปเดตล่าสุด {recentlyUpdated.length} รายการ (เรียลไทม์)</p>
        )}
      </CardContent>
    </Card>
  );
}
