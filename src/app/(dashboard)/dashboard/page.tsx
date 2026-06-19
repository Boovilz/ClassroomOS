import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  Star,
  Coins,
  HeartPulse,
  PiggyBank,
  QrCode,
  UserPlus,
  Gift,
  ListChecks,
  Award,
  HeartHandshake,
  Megaphone,
  FileBadge,
  FileBarChart,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AttendanceAnalyticsChart } from "@/components/dashboard/attendance-analytics-chart";
import { AcademicAnalyticsChart } from "@/components/dashboard/academic-analytics-chart";
import { BehaviorAnalyticsChart } from "@/components/dashboard/behavior-analytics-chart";
import { FinanceAnalyticsChart } from "@/components/dashboard/finance-analytics-chart";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { NotificationPanel } from "@/components/dashboard/notification-panel";
import { LeaderboardWidget } from "@/components/dashboard/leaderboard-widget";
import { RecentActivitiesTimeline } from "@/components/dashboard/recent-activities-timeline";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { createClient } from "@/lib/supabase/server";
import {
  getDashboardHeaderInfo,
  getSummaryCardsData,
  getAttendanceAnalytics,
  getAcademicAnalytics,
  getBehaviorAnalytics,
  getFinanceAnalytics,
  getCalendarEvents,
  getNotifications,
  getTopStudents,
  getRecentActivities,
  getAiInsights,
} from "@/lib/queries/dashboard";

const QUICK_ACTIONS = [
  { href: "/attendance", label: "เช็คชื่อวันนี้", icon: ListChecks },
  { href: "/students", label: "เพิ่มนักเรียน", icon: UserPlus },
  { href: "/behavior", label: "บันทึกพฤติกรรม / ให้ XP", icon: Award },
  { href: "/health", label: "บันทึกสุขภาพ", icon: HeartHandshake },
  { href: "/finance", label: "บันทึกเงินออม", icon: PiggyBank },
  { href: "/communication", label: "สร้างประกาศ", icon: Megaphone },
  { href: "/attendance/qr", label: "สร้าง QR เช็คชื่อ", icon: QrCode },
  { href: "/reward-shop", label: "ร้านค้ารางวัล", icon: Gift },
  { href: "/documents", label: "ออกใบประกาศนียบัตร", icon: FileBadge },
  { href: "/reports", label: "สร้างรายงาน", icon: FileBarChart },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [
    header,
    cards,
    attendanceAnalytics,
    academicAnalytics,
    behaviorAnalytics,
    financeAnalytics,
    events,
    notifications,
    topStudents,
    activities,
    insights,
  ] = await Promise.all([
    getDashboardHeaderInfo(),
    getSummaryCardsData(),
    getAttendanceAnalytics(),
    getAcademicAnalytics(),
    getBehaviorAnalytics(),
    getFinanceAnalytics(),
    getCalendarEvents(),
    getNotifications(),
    getTopStudents(),
    getRecentActivities(),
    getAiInsights(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHeader info={header} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title="นักเรียนทั้งหมด"
          value={cards.students.total}
          icon={<Users className="h-6 w-6" />}
          accent="primary"
          hint={`ชาย ${cards.students.male} · หญิง ${cards.students.female}`}
        />
        <SummaryCard
          title="เข้าเรียนวันนี้"
          value={cards.attendanceToday.present}
          icon={<ClipboardCheck className="h-6 w-6" />}
          accent="secondary"
          hint={`ขาด ${cards.attendanceToday.absent} · ลาป่วย ${cards.attendanceToday.sick} · ลากิจ ${cards.attendanceToday.personalLeave} · สาย ${cards.attendanceToday.late}`}
        />
        <SummaryCard
          title="คะแนนพฤติกรรม"
          value={cards.behavior.averageScore}
          icon={<Star className="h-6 w-6" />}
          accent="accent"
          hint={`ดีเด่น ${cards.behavior.excellentStudents} คน · เสี่ยง ${cards.behavior.riskStudents} คน`}
        />
        <SummaryCard
          title="XP & เหรียญ"
          value={`${cards.gamification.totalXp.toLocaleString()} XP`}
          icon={<Coins className="h-6 w-6" />}
          accent="primary"
          hint={`${cards.gamification.totalCoins.toLocaleString()} เหรียญ · เลเวลเฉลี่ย ${cards.gamification.classroomLevel}`}
        />
        <SummaryCard
          title="เงินออม"
          value={`${cards.savings.totalSavings.toLocaleString()} บาท`}
          icon={<PiggyBank className="h-6 w-6" />}
          accent="secondary"
          hint={`ฝากวันนี้ ${cards.savings.todaysDeposits.toLocaleString()} บาท · บัญชี ${cards.savings.activeAccounts}`}
        />
        <SummaryCard
          title="สถานะสุขภาพ"
          value={cards.health.healthy}
          icon={<HeartPulse className="h-6 w-6" />}
          accent="accent"
          hint={`ผอม ${cards.health.underweight} · เกิน ${cards.health.overweight} · อ้วน ${cards.health.obesity}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>วิเคราะห์ข้อมูลห้องเรียน</CardTitle>
              <CardDescription>ภาพรวมการเข้าเรียน ผลการเรียน พฤติกรรม และการเงิน</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="attendance">
                <TabsList>
                  <TabsTrigger value="attendance">การเข้าเรียน</TabsTrigger>
                  <TabsTrigger value="academic">ผลการเรียน</TabsTrigger>
                  <TabsTrigger value="behavior">พฤติกรรม</TabsTrigger>
                  <TabsTrigger value="finance">การเงิน</TabsTrigger>
                </TabsList>
                <TabsContent value="attendance" className="pt-4">
                  <AttendanceAnalyticsChart data={attendanceAnalytics} />
                </TabsContent>
                <TabsContent value="academic" className="pt-4">
                  <AcademicAnalyticsChart data={academicAnalytics} />
                </TabsContent>
                <TabsContent value="behavior" className="pt-4">
                  <BehaviorAnalyticsChart data={behaviorAnalytics} />
                </TabsContent>
                <TabsContent value="finance" className="pt-4">
                  <FinanceAnalyticsChart trend={financeAnalytics.trend} balance={financeAnalytics.balance} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

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

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>กระดานผู้นำ 10 อันดับ</CardTitle>
                <CardDescription>จัดอันดับตาม XP สะสม</CardDescription>
              </CardHeader>
              <CardContent>
                <LeaderboardWidget students={topStudents} />
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>กิจกรรมล่าสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentActivitiesTimeline activities={activities} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ปฏิทินกิจกรรม</CardTitle>
              <CardDescription>สอบ กิจกรรม ประชุมผู้ปกครอง ทัศนศึกษา วันหยุด</CardDescription>
            </CardHeader>
            <CardContent>
              {profile?.school_id && <CalendarWidget schoolId={profile.school_id} events={events} />}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การแจ้งเตือน</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationPanel notifications={notifications} />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ข้อมูลเชิงลึกจาก AI</CardTitle>
              <CardDescription>นักเรียนที่ควรติดตามและคำแนะนำ</CardDescription>
            </CardHeader>
            <CardContent>
              <AiInsightsPanel insights={insights} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
