"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Medal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LeaderboardRow } from "@/components/leaderboard/leaderboard-table";

const rankAccent: Record<number, string> = {
  0: "border-amber-400/60 ring-2 ring-amber-400/40",
  1: "border-slate-300/60 ring-2 ring-slate-300/40",
  2: "border-orange-400/60 ring-2 ring-orange-400/30",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 1) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-orange-400" />;
  return <span className="text-sm font-semibold text-muted-foreground">#{rank + 1}</span>;
}

export function LeaderboardCards({ data }: { data: LeaderboardRow[] }) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (s) => s.full_name.toLowerCase().includes(q) || s.student_code.toLowerCase().includes(q) || (s.classroom ?? "").toLowerCase().includes(q)
    );
  }, [data, filter]);

  return (
    <div className="space-y-4">
      <Input placeholder="ค้นหานักเรียน..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">ไม่พบข้อมูล</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s) => {
            const rank = data.indexOf(s);
            return (
              <Link key={s.id} href={`/students/${s.id}`}>
                <Card className={`glass-card h-full transition-transform hover:-translate-y-0.5 ${rankAccent[rank] ?? "border-border/60"}`}>
                  <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                    <div className="flex w-full items-center justify-between">
                      <RankBadge rank={rank} />
                      <Badge variant="outline">Lv.{s.level}</Badge>
                    </div>
                    <Avatar className="h-20 w-20 border-2 border-background shadow">
                      <AvatarImage src={s.profile_picture_url ?? s.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xl">{s.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold leading-tight">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.student_code} {s.classroom ? `· ${s.classroom}` : ""}
                      </p>
                    </div>
                    <div className="flex w-full items-center justify-around border-t pt-3 text-sm">
                      <div>
                        <p className="font-bold text-primary">{s.xp.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">XP</p>
                      </div>
                      <div>
                        <p className="font-bold">{s.coins.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">เหรียญ</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
