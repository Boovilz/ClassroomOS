import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { SdqFormDialog } from "./sdq-form-dialog";
import { SdqCreateDialog } from "./sdq-create-dialog";
import { SdqRiskDistributionChart, SdqClassroomComparisonChart } from "@/components/sdq/sdq-charts";
import { CsvExportButton } from "@/components/health/export-buttons";
import {
  getSdqAssessments,
  getSdqDashboard,
  getSdqClassroomComparison,
  sdqRiskLevelLabel,
  sdqRiskLevelColor,
  sdqAssessmentStatusLabel,
  sdqAssessmentTypeLabel,
  SDQ_DISCLAIMER,
} from "@/lib/queries/sdq";

const riskLabel: Record<string, string> = sdqRiskLevelLabel;
const riskVariant: Record<string, "success" | "secondary" | "accent" | "destructive"> = sdqRiskLevelColor;

export default async function SdqPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("id, school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [{ data: students }, assessments, dashboard, classroomComparison] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).is("deleted_at", null).order("full_name"),
    getSdqAssessments({ limit: 50 }),
    profile?.school_id ? getSdqDashboard(profile.school_id) : null,
    profile?.school_id ? getSdqClassroomComparison(profile.school_id) : [],
  ]);

  const csvRows = assessments.map((a) => [
    new Date(a.assessment_date).toLocaleDateString("th-TH"),
    a.students ? `${a.students.full_name} (${a.students.student_code})` : "-",
    sdqAssessmentTypeLabel[a.assessment_type],
    sdqAssessmentStatusLabel[a.status],
    a.total_difficulties_score ?? "-",
    a.risk_level ? riskLabel[a.risk_level] : "-",
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ระบบประเมิน SDQ และคัดกรองนักเรียน</h1>
          <p className="text-sm text-muted-foreground">แบบประเมินพฤติกรรมและจุดแข็ง-จุดอ่อนของนักเรียน (Strengths and Difficulties Questionnaire)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CsvExportButton filename="sdq-assessments.csv" headers={["วันที่", "นักเรียน", "ประเภท", "สถานะ", "คะแนนรวม", "ความเสี่ยง"]} rows={csvRows} />
          {profile?.school_id && profile.id && <SdqCreateDialog schoolId={profile.school_id} currentUserId={profile.id} students={students ?? []} />}
          {profile?.school_id && <SdqFormDialog schoolId={profile.school_id} students={students ?? []} />}
        </div>
      </div>

      <Card className="glass-card border-amber-500/40 bg-amber-500/5">
        <CardContent className="py-3 text-xs text-muted-foreground">{SDQ_DISCLAIMER}</CardContent>
      </Card>

      {dashboard && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card">
            <CardContent className="flex items-center gap-3 pt-6">
              <ClipboardList className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">แบบประเมินทั้งหมด</p>
                <p className="text-xl font-bold">{dashboard.totalAssessments.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">เสร็จสมบูรณ์ ({dashboard.completionRate}%)</p>
                <p className="text-xl font-bold">{dashboard.completedAssessments.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="flex items-center gap-3 pt-6">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">รอดำเนินการ</p>
                <p className="text-xl font-bold">{dashboard.pendingAssessments.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">กลุ่มเสี่ยงสูง/วิกฤต</p>
                <p className="text-xl font-bold">
                  {(dashboard.riskDistribution.find((r) => r.level === "high_risk")?.count ?? 0) +
                    (dashboard.riskDistribution.find((r) => r.level === "critical")?.count ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {dashboard && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>การกระจายระดับความเสี่ยง</CardTitle>
            </CardHeader>
            <CardContent>
              <SdqRiskDistributionChart data={dashboard.riskDistribution} />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>คะแนนเฉลี่ยรายห้องเรียน</CardTitle>
            </CardHeader>
            <CardContent>
              <SdqClassroomComparisonChart data={classroomComparison} />
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายการแบบประเมิน</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่ประเมิน</TableHead>
                <TableHead>นักเรียน</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>คะแนนรวม</TableHead>
                <TableHead>ระดับความเสี่ยง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.length > 0 ? (
                assessments.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/sdq/${a.id}`} className="block">
                        {new Date(a.assessment_date).toLocaleDateString("th-TH")}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/sdq/${a.id}`} className="block">
                        {a.students ? `${a.students.full_name} (${a.students.student_code})` : "-"}
                      </Link>
                    </TableCell>
                    <TableCell>{sdqAssessmentTypeLabel[a.assessment_type]}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sdqAssessmentStatusLabel[a.status]}</Badge>
                    </TableCell>
                    <TableCell>{a.total_difficulties_score ?? "-"}</TableCell>
                    <TableCell>
                      {a.risk_level && <Badge variant={riskVariant[a.risk_level] ?? "secondary"}>{riskLabel[a.risk_level] ?? a.risk_level}</Badge>}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีผลการประเมิน
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
