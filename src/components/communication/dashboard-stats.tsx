import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommunicationDashboardStats } from "@/lib/queries/communication";
import { Users, MessageSquare, Megaphone, Bell, Smartphone, TrendingUp } from "lucide-react";

export function CommunicationDashboardStatsGrid({ stats }: { stats: CommunicationDashboardStats }) {
  const cards = [
    { label: "ผู้ปกครองที่เชื่อมต่อ", value: stats.parentsConnected, icon: Users },
    { label: "สมาชิก LINE OA (จำลอง)", value: stats.lineSubscribers, icon: Smartphone },
    { label: "ข้อความที่ยังไม่อ่าน", value: stats.unreadMessages, icon: MessageSquare },
    { label: "ประกาศวันนี้", value: stats.announcementsSentToday, icon: Megaphone },
    { label: "แจ้งเตือนการมาเรียนวันนี้", value: stats.attendanceNotificationsToday, icon: Bell },
    { label: "แจ้งเตือนพฤติกรรมวันนี้", value: stats.behaviorNotificationsToday, icon: Bell },
    { label: "แจ้งเตือนผลการเรียนวันนี้", value: stats.academicNotificationsToday, icon: Bell },
    { label: "อัตราการมีส่วนร่วมของผู้ปกครอง", value: `${stats.parentEngagementRate}%`, icon: TrendingUp },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
