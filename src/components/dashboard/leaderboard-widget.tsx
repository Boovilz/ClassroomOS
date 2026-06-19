import { Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { LeaderboardEntry } from "@/lib/queries/dashboard";

const RANK_COLORS = ["bg-amber-400", "bg-slate-300", "bg-orange-400"];

export function LeaderboardWidget({ students }: { students: LeaderboardEntry[] }) {
  if (students.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลนักเรียน</p>;
  }

  return (
    <div className="space-y-2">
      {students.map((s, i) => (
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
          <div className="text-right text-xs">
            <p className="font-semibold tabular-nums">{s.xp.toLocaleString()} XP</p>
            <p className="text-muted-foreground tabular-nums">{s.coins.toLocaleString()} เหรียญ</p>
          </div>
          {s.badgeCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Award className="h-3 w-3" />
              {s.badgeCount}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
