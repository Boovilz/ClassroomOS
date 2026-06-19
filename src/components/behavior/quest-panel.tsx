import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

interface QuestProgressRow {
  id: string;
  progress_count: number;
  completed_at: string | null;
  quests: {
    title: string;
    description: string | null;
    period: "daily" | "weekly" | "monthly";
    target_count: number;
    xp_reward: number;
    coin_reward: number;
  } | null;
}

const PERIOD_LABEL: Record<string, string> = { daily: "รายวัน", weekly: "รายสัปดาห์", monthly: "รายเดือน" };

export function QuestPanel({ progress }: { progress: QuestProgressRow[] }) {
  if (progress.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีเควสที่กำลังดำเนินการ</p>;
  }
  return (
    <div className="space-y-2">
      {progress.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
          {p.completed_at ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          ) : (
            <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{p.quests?.title}</p>
            <p className="text-xs text-muted-foreground">
              {p.quests && PERIOD_LABEL[p.quests.period]} · ความก้าวหน้า {p.progress_count}/{p.quests?.target_count ?? 1}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            +{p.quests?.xp_reward ?? 0} XP / +{p.quests?.coin_reward ?? 0} เหรียญ
          </Badge>
        </div>
      ))}
    </div>
  );
}
