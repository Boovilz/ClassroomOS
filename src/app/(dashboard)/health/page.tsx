import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, HeartPulse, Salad, ShieldCheck, Syringe, Users } from "lucide-react";
import {
  getHealthDashboard,
  getBmiDistribution,
  getVaccinationCoverage,
  getActiveHealthAlerts,
  nutritionStatusLabel,
  type NutritionStatus,
} from "@/lib/queries/health";
import { MeasurementDialog } from "@/components/health/measurement-dialog";
import { VaccinationDialog } from "@/components/health/vaccination-dialog";
import { BmiDistributionChart } from "@/components/health/bmi-distribution-chart";
import { VaccinationCoverageChart } from "@/components/health/vaccination-coverage-chart";
import { AlertCenter } from "@/components/health/alert-center";

const nutritionVariant: Record<NutritionStatus, "success" | "secondary" | "destructive" | "outline"> = {
  normal: "success",
  underweight: "secondary",
  severely_underweight: "destructive",
  overweight: "secondary",
  obese: "destructive",
};

export default async function HealthPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("id, school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [
    stats,
    bmiDistribution,
    vaccinationCoverage,
    activeAlerts,
    { data: students },
    { data: records },
  ] = await Promise.all([
    getHealthDashboard(),
    getBmiDistribution(),
    getVaccinationCoverage(),
    getActiveHealthAlerts(20),
    supabase.from("students").select("id, full_name, student_code").eq("is_active", true).is("deleted_at", null).order("full_name"),
    supabase
      .from("health_records")
      .select("id, student_id, height_cm, weight_kg, bmi, nutrition_status, allergies, recorded_at, students(full_name, student_code, classroom, deleted_at)")
      .order("recorded_at", { ascending: false })
      .limit(50)
      .returns<
        {
          id: string;
          student_id: string;
          height_cm: number | null;
          weight_kg: number | null;
          bmi: number | null;
          nutrition_status: NutritionStatus | null;
          allergies: string | null;
          recorded_at: string;
          students: { full_name: string; student_code: string; classroom: string | null; deleted_at: string | null } | null;
        }[]
      >(),
  ]);

  const visibleRecords = (records ?? []).filter((r) => !r.students || !r.students.deleted_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">สุขภาพและโภชนาการนักเรียน</h1>
          <p className="text-sm text-muted-foreground">ภาพรวมสุขภาพ การเจริญเติบโต วัคซีน และการแจ้งเตือนด้านสุขภาพ</p>
        </div>
        {profile?.school_id && (
          <div className="flex flex-wrap gap-2">
            <MeasurementDialog schoolId={profile.school_id} students={students ?? []} userId={profile.id} />
            <VaccinationDialog schoolId={profile.school_id} students={students ?? []} userId={profile.id} />
          </div>
        )}
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
            <HeartPulse className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">โภชนาการปกติ</p>
              <p className="text-xl font-bold">{stats.healthyCount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Activity className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">น้ำหนักต่ำกว่าเกณฑ์</p>
              <p className="text-xl font-bold">{stats.underweightCount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Salad className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">น้ำหนักเกิน/อ้วน</p>
              <p className="text-xl font-bold">{(stats.overweightCount + stats.obeseCount).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <ShieldCheck className="h-8 w-8 text-sky-500" />
            <div>
              <p className="text-xs text-muted-foreground">มีโรคประจำตัว</p>
              <p className="text-xl font-bold">{stats.medicalConditionCount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">มีประวัติแพ้</p>
              <p className="text-xl font-bold">{stats.allergyCount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <Syringe className="h-8 w-8 text-violet-500" />
            <div>
              <p className="text-xs text-muted-foreground">ฉีดวัคซีนครบ</p>
              <p className="text-xl font-bold">{stats.vaccinationCompletionRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">แจ้งเตือนวันนี้</p>
              <p className="text-xl font-bold">{stats.todayAlertCount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>การกระจายค่า BMI</CardTitle>
          </CardHeader>
          <CardContent>
            <BmiDistributionChart data={bmiDistribution} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>ความครอบคลุมวัคซีน</CardTitle>
          </CardHeader>
          <CardContent>
            {vaccinationCoverage.length > 0 ? (
              <VaccinationCoverageChart data={vaccinationCoverage} />
            ) : (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลวัคซีน</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ศูนย์แจ้งเตือนสุขภาพ</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertCenter alerts={activeAlerts} approverId={profile?.id} />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>บันทึกสุขภาพล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสนักเรียน</TableHead>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>ห้องเรียน</TableHead>
                <TableHead>ส่วนสูง (ซม.)</TableHead>
                <TableHead>น้ำหนัก (กก.)</TableHead>
                <TableHead>BMI</TableHead>
                <TableHead>สถานะโภชนาการ</TableHead>
                <TableHead>บันทึกเมื่อ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRecords.length > 0 ? (
                visibleRecords.map((r) => {
                  const student = Array.isArray(r.students) ? r.students[0] : r.students;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/health/${r.student_id}`} className="hover:underline">
                          {student?.student_code}
                        </Link>
                      </TableCell>
                      <TableCell>{student?.full_name}</TableCell>
                      <TableCell>{student?.classroom ?? "-"}</TableCell>
                      <TableCell>{r.height_cm ?? "-"}</TableCell>
                      <TableCell>{r.weight_kg ?? "-"}</TableCell>
                      <TableCell>{r.bmi ?? "-"}</TableCell>
                      <TableCell>
                        {r.nutrition_status ? (
                          <Badge variant={nutritionVariant[r.nutrition_status]}>{nutritionStatusLabel[r.nutrition_status]}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{new Date(r.recorded_at).toLocaleDateString("th-TH")}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีข้อมูลสุขภาพ
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
