import { CheckSquare, Star, BookOpen, HeartPulse, Wallet, MessageCircle, Coins } from "lucide-react";
import type { RecentActivity } from "@/lib/queries/dashboard";

const ICON_BY_TYPE: Record<string, typeof CheckSquare> = {
  attendance: CheckSquare,
  xp_award: Coins,
  behavior: Star,
  health: HeartPulse,
  finance: Wallet,
  communication: MessageCircle,
  academic: BookOpen,
};

export function RecentActivitiesTimeline({ activities }: { activities: RecentActivity[] }) {
  if (activities.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีกิจกรรมล่าสุด</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = ICON_BY_TYPE[activity.activity_type] ?? Star;
        return (
          <div key={activity.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {activity.description}
                {activity.student_name && <span className="font-medium"> — {activity.student_name}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(activity.occurred_at).toLocaleString("th-TH", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
