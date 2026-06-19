"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const RANK_COLORS = ["bg-amber-400", "bg-slate-300", "bg-orange-400"];

interface LeaderboardRow {
  id: string;
  full_name: string;
  student_code: string;
  avatar_url: string | null;
  level: number;
  metric: number;
}

function MetricList({ rows, unit }: { rows: LeaderboardRow[]; unit: string }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลนักเรียน</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map((s, i) => (
        <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${RANK_COLORS[i] ?? "bg-muted text-muted-foreground"}`}
          >
            {i + 1}
          </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src={s.avatar_url ?? undefined} alt={s.full_name} />
            <AvatarFallback>{s.full_name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{s.full_name}</p>
            <p className="text-xs text-muted-foreground">เลเวล {s.level} · {s.student_code}</p>
          </div>
          <p className="text-sm font-semibold tabular-nums">
            {s.metric.toLocaleString()} {unit}
          </p>
        </div>
      ))}
    </div>
  );
}

export function LeaderboardTabs({
  xp,
  coins,
  behavior,
  attendance,
}: {
  xp: LeaderboardRow[];
  coins: LeaderboardRow[];
  behavior: LeaderboardRow[];
  attendance: LeaderboardRow[];
}) {
  const [tab, setTab] = useState("xp");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="xp">XP</TabsTrigger>
        <TabsTrigger value="coins">เหรียญ</TabsTrigger>
        <TabsTrigger value="behavior">พฤติกรรม</TabsTrigger>
        <TabsTrigger value="attendance">การเข้าเรียน</TabsTrigger>
      </TabsList>
      <TabsContent value="xp" className="pt-4">
        <MetricList rows={xp} unit="XP" />
      </TabsContent>
      <TabsContent value="coins" className="pt-4">
        <MetricList rows={coins} unit="เหรียญ" />
      </TabsContent>
      <TabsContent value="behavior" className="pt-4">
        <MetricList rows={behavior} unit="คะแนน" />
      </TabsContent>
      <TabsContent value="attendance" className="pt-4">
        <MetricList rows={attendance} unit="%" />
      </TabsContent>
    </Tabs>
  );
}
