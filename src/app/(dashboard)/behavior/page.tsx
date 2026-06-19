import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BehaviorPointsDialog } from "@/components/behavior/behavior-points-dialog";
import { LeaderboardTabs } from "@/components/behavior/leaderboard-tabs";
import { LevelCard } from "@/components/behavior/level-card";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Star, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { getBehaviorDashboard, getBehaviorCategories, getLeaderboard } from "@/lib/queries/behavior";

export default async function BehaviorPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [{ data: students }, { data: records }, stats, categories, xpBoard, coinsBoard, behaviorBoard, attendanceBoard] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code, xp, coins").eq("is_active", true).order("full_name"),
    supabase
      .from("behavior_records")
      .select("id, title, category, points, occurred_at, students(full_name, student_code)")
      .order("occurred_at", { ascending: false })
      .limit(30)
      .returns<
        {
          id: string;
          title: string;
          category: string;
          points: number;
          occurred_at: string;
          students: { full_name: string; student_code: string } | null;
        }[]
      >(),
    getBehaviorDashboard(),
    getBehaviorCategories(),
    getLeaderboard("xp"),
    getLeaderboard("coins"),
    getLeaderboard("behavior"),
    getLeaderboard("attendance"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">พฤติกรรม &amp; เกมมิฟิเคชัน</h1>
          <p className="text-sm text-muted-foreground">บันทึกพฤติกรรมเชิงบวก/ลบ ติดตาม XP เหรียญ และเหรียญตรา</p>
        </div>
        {profile?.school_id && (
          <BehaviorPointsDialog schoolId={profile.school_id} students={students ?? []} categories={categories} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="คะแนนพฤติกรรมเฉลี่ย"
          value={stats.averageScore}
          icon={<Star className="h-6 w-6" />}
          accent="primary"
          hint={`ดีเด่น ${stats.excellentStudents} คน · เสี่ยง ${stats.riskStudents} คน`}
        />
        <SummaryCard
          title="คะแนนบวกวันนี้"
          value={`+${stats.todayPositive}`}
          icon={<TrendingUp className="h-6 w-6" />}
          accent="secondary"
          hint={`สัปดาห์นี้ +${stats.weekPositive}`}
        />
        <SummaryCard
          title="คะแนนลบวันนี้"
          value={stats.todayNegative}
          icon={<TrendingDown className="h-6 w-6" />}
          accent="accent"
          hint={`สัปดาห์นี้ ${stats.weekNegative}`}
        />
        <SummaryCard
          title="นักเรียนเสี่ยง"
          value={stats.riskStudents}
          icon={<AlertTriangle className="h-6 w-6" />}
          accent="primary"
          hint="คะแนนพฤติกรรมต่ำกว่า 60"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>กระดานผู้นำ</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardTabs xp={xpBoard} coins={coinsBoard} behavior={behaviorBoard} attendance={attendanceBoard} />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>บันทึกพฤติกรรมล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {records && records.length > 0 ? (
                records.map((r) => {
                  const student = Array.isArray(r.students) ? r.students[0] : r.students;
                  return (
                    <div key={r.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-muted-foreground">
                          {student?.full_name} ({student?.student_code})
                        </p>
                      </div>
                      <Badge variant={r.category === "positive" ? "success" : "destructive"}>
                        {r.points > 0 ? "+" : ""}
                        {r.points}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกพฤติกรรม</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>เลเวลนักเรียน (Top 5 XP)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {xpBoard.slice(0, 5).map((s) => (
                <div key={s.id}>
                  <p className="mb-1 text-sm font-medium">{s.full_name}</p>
                  <LevelCard xp={s.xp} coins={s.coins} />
                </div>
              ))}
              {xpBoard.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
