import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HandHeart, AlertTriangle, Award, ClipboardCheck, Users, TrendingUp } from "lucide-react";
import { getWelfareDashboard, getWelfareAnalytics, getOpenCases, getRiskStudentReport } from "@/lib/queries/welfare";
import { IncomeDistributionChart, RiskDistributionChart, VisitCompletionChart } from "@/components/welfare/welfare-charts";
import { CsvExportButton, PrintButton } from "@/components/health/export-buttons";

const caseStatusLabel: Record<string, string> = {
  open: "เปิดเคส",
  monitoring: "ติดตาม",
  resolved: "แก้ไขแล้ว",
  closed: "ปิดเคส",
};
const caseStatusVariant: Record<string, "default" | "success" | "secondary" | "destructive" | "outline"> = {
  open: "destructive",
  monitoring: "secondary",
  resolved: "success",
  closed: "outline",
};

const riskLevelVariant: Record<string, "default" | "success" | "secondary" | "destructive"> = {
  low: "success",
  medium: "secondary",
  high: "destructive",
};

const studentRiskLevelLabel: Record<string, string> = {
  low: "ความเสี่ยงต่ำ",
  medium: "ความเสี่ยงปานกลาง",
  high: "ความเสี่ยงสูง",
};

export default async function WelfareDashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const schoolId = profile?.school_id ?? "";

  const [stats, analytics, openCases, riskStudents] = await Promise.all([
    getWelfareDashboard(schoolId),
    getWelfareAnalytics(schoolId),
    getOpenCases(schoolId),
    getRiskStudentReport(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/home-visits">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Button>
        </Link>
        <div className="flex gap-2">
          <PrintButton label="พิมพ์รายงานสวัสดิภาพ" />
          <CsvExportButton
            filename="risk-students.csv"
            headers={["รหัสนักเรียน", "ชื่อ", "ห้อง", "ระดับความเสี่ยง", "คะแนนความยากจน", "สถานะสวัสดิภาพ"]}
            rows={riskStudents.map((s) => [
              s.student_code,
              s.full_name,
              s.classroom ?? "",
              s.risk_level ?? "",
              s.poverty_risk_score ?? "",
              s.welfare_status ?? "",
            ])}
            label="ดาวน์โหลดรายชื่อนักเรียนกลุ่มเสี่ยง"
          />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">แดชบอร์ดสวัสดิภาพนักเรียน</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมความเสี่ยง การช่วยเหลือ และกรณีที่อยู่ระหว่างติดตาม</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <Award className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">นักเรียนรับทุนการศึกษา</p>
              <p className="text-xl font-bold">{stats.scholarshipStudents.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <HandHeart className="h-8 w-8 text-violet-500" />
            <div>
              <p className="text-xs text-muted-foreground">ได้รับความช่วยเหลือ</p>
              <p className="text-xl font-bold">{stats.studentsReceivingAssistance.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-8 w-8 text-sky-500" />
            <div>
              <p className="text-xs text-muted-foreground">ต้องติดตามต่อ</p>
              <p className="text-xl font-bold">{stats.studentsRequiringFollowUp.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <ClipboardCheck className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">เคสที่รอดำเนินการ</p>
              <p className="text-xl font-bold">{stats.pendingCases.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">อัตราความสำเร็จของแผนช่วยเหลือ</p>
              <p className="text-xl font-bold">{stats.interventionSuccessRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>การกระจายความเสี่ยงนักเรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskDistributionChart data={analytics.riskDistribution} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>การวิเคราะห์รายได้ครัวเรือน</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeDistributionChart data={analytics.incomeDistribution} />
          </CardContent>
        </Card>
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>อัตราการเยี่ยมบ้านสำเร็จ</CardTitle>
          </CardHeader>
          <CardContent>
            <VisitCompletionChart data={analytics.visitCompletion} />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>เปรียบเทียบความเสี่ยงรายห้องเรียน</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">ห้องเรียน</th>
                <th className="py-2 pr-4">นักเรียน</th>
                <th className="py-2 pr-4">เยี่ยมบ้านแล้ว</th>
                <th className="py-2 pr-4">กลุ่มเสี่ยง</th>
                <th className="py-2 pr-4">ยากจน</th>
                <th className="py-2 pr-4">ได้รับช่วยเหลือ</th>
              </tr>
            </thead>
            <tbody>
              {analytics.classroomComparison.map((row) => (
                <tr key={row.classroom} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{row.classroom}</td>
                  <td className="py-2 pr-4">{row.studentCount}</td>
                  <td className="py-2 pr-4">{row.visitsCompleted}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={row.riskCount > 0 ? "destructive" : "outline"}>{row.riskCount}</Badge>
                  </td>
                  <td className="py-2 pr-4">{row.poorCount}</td>
                  <td className="py-2 pr-4">{row.assistanceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>เคสที่เปิดอยู่/อยู่ระหว่างติดตาม</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openCases.length > 0 ? (
              openCases.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.students?.full_name} ({c.students?.student_code}) · {c.students?.classroom}
                    </p>
                  </div>
                  <Badge variant={caseStatusVariant[c.status] ?? "default"}>{caseStatusLabel[c.status] ?? c.status}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มีเคสที่เปิดอยู่</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>นักเรียนกลุ่มเสี่ยง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {riskStudents.length > 0 ? (
              riskStudents.map((s) => (
                <Link key={s.id} href={`/students/${s.id}`} className="block">
                  <div className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent/40">
                    <div>
                      <p className="font-medium">
                        {s.full_name} ({s.student_code})
                      </p>
                      <p className="text-xs text-muted-foreground">{s.classroom}</p>
                    </div>
                    <Badge variant={riskLevelVariant[s.risk_level ?? ""] ?? "default"}>
                      {studentRiskLevelLabel[s.risk_level ?? ""] ?? s.risk_level}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">ไม่พบนักเรียนกลุ่มเสี่ยงในขณะนี้</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
