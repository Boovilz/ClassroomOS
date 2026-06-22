import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  CalendarCheck,
  CalendarClock,
  AlertTriangle,
  HandHeart,
  Users,
  ClipboardList,
} from "lucide-react";
import { HomeVisitFormDialog } from "./home-visit-form-dialog";
import { ScheduleVisitDialog } from "@/components/home-visits/schedule-visit-dialog";
import {
  getHomeVisitDashboard,
  getVisitCompletionRate,
  getStudentRiskDistribution,
  getHouseholdIncomeAnalysis,
  getStudentWelfareStatusDistribution,
} from "@/lib/queries/welfare";
import {
  VisitCompletionChart,
  RiskDistributionChart,
  IncomeDistributionChart,
  WelfareStatusChart,
} from "@/components/welfare/welfare-charts";

const statusLabel: Record<string, string> = {
  scheduled: "นัดหมายแล้ว",
  completed: "เยี่ยมแล้ว",
  cancelled: "ยกเลิก",
  rescheduled: "เลื่อนนัด",
};
const statusVariant: Record<string, "default" | "success" | "secondary" | "destructive"> = {
  scheduled: "default",
  completed: "success",
  cancelled: "destructive",
  rescheduled: "secondary",
};

export default async function HomeVisitsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("id, school_id").eq("id", auth.user.id).single()
    : { data: null };
  const { data: teacher } = auth?.user
    ? await supabase.from("teachers").select("id").eq("user_id", auth.user.id).maybeSingle()
    : { data: null };

  const [{ data: students }, { data: visits }, stats, visitCompletion, riskDistribution, incomeDistribution, welfareStatus] =
    await Promise.all([
      supabase.from("students").select("id, full_name, student_code").eq("is_active", true).order("full_name"),
      supabase
        .from("home_visits")
        .select(
          "id, visit_date, visit_time, visit_type, status, summary, family_situation, follow_up_required, students(full_name, student_code)"
        )
        .order("visit_date", { ascending: false })
        .limit(30)
        .returns<
          {
            id: string;
            visit_date: string;
            visit_time: string | null;
            visit_type: string;
            status: string;
            summary: string | null;
            family_situation: string | null;
            follow_up_required: boolean;
            students: { full_name: string; student_code: string } | null;
          }[]
        >(),
      getHomeVisitDashboard(),
      getVisitCompletionRate(),
      getStudentRiskDistribution(),
      getHouseholdIncomeAnalysis(),
      getStudentWelfareStatusDistribution(),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ระบบเยี่ยมบ้านและสวัสดิภาพนักเรียน</h1>
          <p className="text-sm text-muted-foreground">
            บันทึกการเยี่ยมบ้าน ประเมินความเสี่ยง และบริหารกรณีช่วยเหลือนักเรียน
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/home-visits/welfare" className="text-sm">
            <Badge variant="outline" className="cursor-pointer px-3 py-1.5">
              <HandHeart className="mr-1.5 h-3.5 w-3.5" />
              แดชบอร์ดสวัสดิภาพนักเรียน
            </Badge>
          </Link>
          {profile?.school_id && (
            <>
              <ScheduleVisitDialog schoolId={profile.school_id} teacherId={teacher?.id ?? null} userId={profile.id} students={students ?? []} />
              <HomeVisitFormDialog schoolId={profile.school_id} teacherId={teacher?.id ?? null} students={students ?? []} />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">นักเรียนทั้งหมด</p>
              <p className="text-xl font-bold">{stats.totalStudents.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <CalendarCheck className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">เยี่ยมบ้านเสร็จสิ้น</p>
              <p className="text-xl font-bold">{stats.homeVisitsCompleted.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <CalendarClock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">รอเยี่ยมบ้าน</p>
              <p className="text-xl font-bold">{stats.pendingHomeVisits.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">นักเรียนกลุ่มเสี่ยง</p>
              <p className="text-xl font-bold">{stats.riskStudents.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Home className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">นักเรียนยากจน</p>
              <p className="text-xl font-bold">{stats.poorStudents.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <ClipboardList className="h-8 w-8 text-sky-500" />
            <div>
              <p className="text-xs text-muted-foreground">ต้องการการสนับสนุนพิเศษ</p>
              <p className="text-xl font-bold">{stats.specialNeedsStudents.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <HandHeart className="h-8 w-8 text-violet-500" />
            <div>
              <p className="text-xs text-muted-foreground">ได้รับความช่วยเหลือ</p>
              <p className="text-xl font-bold">{stats.studentsRequiringAssistance.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <CalendarClock className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">นัดหมายวันนี้</p>
              <p className="text-xl font-bold">{stats.todayScheduledVisits.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>อัตราการเยี่ยมบ้านสำเร็จ</CardTitle>
          </CardHeader>
          <CardContent>
            <VisitCompletionChart data={visitCompletion} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>การกระจายความเสี่ยงนักเรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskDistributionChart data={riskDistribution} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>การวิเคราะห์รายได้ครัวเรือน</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeDistributionChart data={incomeDistribution} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>สถานะสวัสดิภาพนักเรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <WelfareStatusChart data={welfareStatus} />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายการเยี่ยมบ้านล่าสุด</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visits && visits.length > 0 ? (
            visits.map((v) => {
              const student = Array.isArray(v.students) ? v.students[0] : v.students;
              return (
                <Link key={v.id} href={`/home-visits/${v.id}`} className="block">
                  <Card className="glass-card transition hover:bg-accent/40">
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                      <div>
                        <CardTitle className="text-base">
                          {student?.full_name} ({student?.student_code})
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.visit_date).toLocaleDateString("th-TH")}
                          {v.visit_time ? ` เวลา ${v.visit_time.slice(0, 5)}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {v.follow_up_required && <Badge variant="destructive">ต้องติดตามต่อ</Badge>}
                        <Badge variant={statusVariant[v.status] ?? "default"}>{statusLabel[v.status] ?? v.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {v.summary && <p>{v.summary}</p>}
                      {v.family_situation && (
                        <p className="text-muted-foreground">สภาพครอบครัว: {v.family_situation}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          ) : (
            <Card className="glass-card">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                ยังไม่มีบันทึกการเยี่ยมบ้าน
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
