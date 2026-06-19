import Link from "next/link";
import { Users, ClipboardCheck, Star, Coins, QrCode, UserPlus, Gift, ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { PerformanceTrendChart } from "@/components/dashboard/performance-trend-chart";
import {
  getDashboardSummary,
  getAttendanceTrend,
  getPerformanceTrend,
} from "@/lib/queries/dashboard";

const QUICK_ACTIONS = [
  { href: "/students", label: "เพิ่มนักเรียน", icon: UserPlus },
  { href: "/attendance", label: "เช็คชื่อวันนี้", icon: ListChecks },
  { href: "/attendance/qr", label: "สร้าง QR เช็คชื่อ", icon: QrCode },
  { href: "/reward-shop", label: "ร้านค้ารางวัล", icon: Gift },
];

export default async function DashboardPage() {
  const [summary, attendanceTrend, performanceTrend] = await Promise.all([
    getDashboardSummary(),
    getAttendanceTrend(),
    getPerformanceTrend(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">แดชบอร์ดภาพรวม</h1>
        <p className="text-sm text-muted-foreground">สรุปข้อมูลห้องเรียนของคุณวันนี้</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="นักเรียนทั้งหมด" value={summary.totalStudents} icon={<Users className="h-6 w-6" />} accent="primary" />
        <SummaryCard
          title="เข้าเรียนวันนี้"
          value={`${summary.presentToday} / ${summary.totalStudents}`}
          icon={<ClipboardCheck className="h-6 w-6" />}
          accent="secondary"
          hint={`${summary.attendanceRatePercent}% ของนักเรียนทั้งหมด`}
        />
        <SummaryCard title="พฤติกรรมสัปดาห์นี้" value={summary.behaviorEventsThisWeek} icon={<Star className="h-6 w-6" />} accent="accent" />
        <SummaryCard
          title="XP / เหรียญสะสมรวม"
          value={`${summary.totalXp.toLocaleString()} XP`}
          icon={<Coins className="h-6 w-6" />}
          accent="primary"
          hint={`${summary.totalCoins.toLocaleString()} เหรียญ`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>แนวโน้มการเข้าเรียน (7 วันล่าสุด)</CardTitle>
            <CardDescription>จำนวนนักเรียนที่มา / มาสาย / ขาดเรียน</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={attendanceTrend} />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>แนวโน้มผลการเรียน</CardTitle>
            <CardDescription>คะแนนเฉลี่ยแต่ละภาคเรียน (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceTrendChart data={performanceTrend} />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ทางลัด</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="outline" className="gap-2">
              <Link href={href}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
