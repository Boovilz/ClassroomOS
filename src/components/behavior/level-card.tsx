import { Progress } from "@/components/ui/progress";
import { getLevelInfo } from "@/lib/gamification/levels";

export function LevelCard({ xp, coins }: { xp: number; coins: number }) {
  const info = getLevelInfo(xp);
  return (
    <div className="space-y-2 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Level {info.level} · {info.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {info.xp.toLocaleString()} XP · {coins.toLocaleString()} เหรียญ
        </p>
      </div>
      <Progress value={info.progressPercent} />
      <p className="text-right text-xs text-muted-foreground">
        {info.nextTierMinXp ? `อีก ${(info.nextTierMinXp - info.xp).toLocaleString()} XP ถึงเลเวลถัดไป` : "ถึงเลเวลสูงสุดแล้ว"}
      </p>
    </div>
  );
}
