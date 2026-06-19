import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getHealthProfile,
  getGrowthHistory,
  getStudentVaccinations,
  getStudentScreenings,
  getStudentMedicalConditions,
  getStudentAllergies,
  getStudentMedications,
  getAiHealthAnalysis,
  nutritionStatusLabel,
  screeningTypeLabel,
  type NutritionStatus,
} from "@/lib/queries/health";
import { GrowthChart } from "@/components/health/growth-chart";
import { PrintButton, CsvExportButton } from "@/components/health/export-buttons";
import { Sparkles } from "lucide-react";

const nutritionVariant: Record<NutritionStatus, "success" | "secondary" | "destructive"> = {
  normal: "success",
  underweight: "secondary",
  severely_underweight: "destructive",
  overweight: "secondary",
  obese: "destructive",
};

const conditionTypeLabel: Record<string, string> = {
  chronic: "โรคเรื้อรัง",
  congenital: "โรคแต่กำเนิด",
  physical_disability: "ความบกพร่องทางร่างกาย",
  learning_disability: "ความบกพร่องทางการเรียนรู้",
  mental_health: "สุขภาพจิต",
};

const severityLabel: Record<string, string> = {
  mild: "เล็กน้อย",
  moderate: "ปานกลาง",
  severe: "รุนแรง",
  life_threatening: "อันตรายถึงชีวิต",
};

const resultLabel: Record<string, string> = { pass: "ปกติ", monitor: "ติดตาม", refer: "ส่งต่อ" };
const resultVariant: Record<string, "success" | "secondary" | "destructive"> = {
  pass: "success",
  monitor: "secondary",
  refer: "destructive",
};

export default async function HealthProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [profile, growth, vaccinations, screenings, conditions, studentAllergies, medications, aiInsights] = await Promise.all([
    getHealthProfile(id),
    getGrowthHistory(id),
    getStudentVaccinations(id),
    getStudentScreenings(id),
    getStudentMedicalConditions(id),
    getStudentAllergies(id),
    getStudentMedications(id),
    getAiHealthAnalysis(id),
  ]);

  if (!profile.student) {
    notFound();
  }

  const { student, latestRecord } = profile;

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={student!.avatar_url ?? undefined} />
            <AvatarFallback>{student!.full_name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{student!.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              {student!.student_code} {student!.classroom ? `· ห้อง ${student!.classroom}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <PrintButton label="พิมพ์รายงานสุขภาพ" />
          <CsvExportButton
            filename={`health-${student!.student_code}.csv`}
            headers={["วันที่", "ส่วนสูง(ซม.)", "น้ำหนัก(กก.)", "BMI"]}
            rows={growth.map((g) => [g.recorded_at, g.height_cm, g.weight_kg, g.bmi])}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">กรุ๊ปเลือด</p>
            <p className="text-xl font-bold">{student!.blood_type ?? "ไม่ระบุ"}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">ส่วนสูง / น้ำหนัก ล่าสุด</p>
            <p className="text-xl font-bold">
              {latestRecord?.height_cm ?? "-"} ซม. / {latestRecord?.weight_kg ?? "-"} กก.
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">ค่า BMI</p>
            <p className="text-xl font-bold">{latestRecord?.bmi ?? "-"}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">สถานะโภชนาการ</p>
            {latestRecord?.nutrition_status ? (
              <Badge variant={nutritionVariant[latestRecord.nutrition_status]}>{nutritionStatusLabel[latestRecord.nutrition_status]}</Badge>
            ) : (
              <p className="text-xl font-bold">ไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            วิเคราะห์สุขภาพโดย AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {aiInsights.map((insight, i) => (
              <li key={i} className="rounded-md bg-muted/50 p-3">
                {insight}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>กราฟการเจริญเติบโต</CardTitle>
        </CardHeader>
        <CardContent>
          {growth.length > 0 ? <GrowthChart data={growth} /> : <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการเจริญเติบโต</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>โรคประจำตัว / ภาวะสุขภาพ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conditions.length > 0 ? (
              conditions.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{conditionTypeLabel[c.condition_type] ?? c.condition_type}</p>
                  </div>
                  <Badge variant={c.severity === "severe" ? "destructive" : "secondary"}>{severityLabel[c.severity]}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">ไม่พบข้อมูล</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>ประวัติการแพ้</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {studentAllergies.length > 0 ? (
              studentAllergies.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium">{a.allergen}</p>
                    <p className="text-xs text-muted-foreground">{a.emergency_instructions ?? "-"}</p>
                  </div>
                  <Badge variant={a.severity === "severe" || a.severity === "life_threatening" ? "destructive" : "secondary"}>
                    {severityLabel[a.severity]}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">ไม่พบข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ประวัติวัคซีน</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วัคซีน</TableHead>
                <TableHead>เข็มที่</TableHead>
                <TableHead>วันที่ฉีด</TableHead>
                <TableHead>นัดครั้งต่อไป</TableHead>
                <TableHead>สถานพยาบาล</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaccinations.length > 0 ? (
                vaccinations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.vaccine_name}</TableCell>
                    <TableCell>{v.dose_number ?? "-"}</TableCell>
                    <TableCell>{v.administered_at ? new Date(v.administered_at).toLocaleDateString("th-TH") : "-"}</TableCell>
                    <TableCell>{v.next_due_at ? new Date(v.next_due_at).toLocaleDateString("th-TH") : "-"}</TableCell>
                    <TableCell>{v.hospital ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={v.status === "completed" ? "success" : v.status === "overdue" ? "destructive" : "secondary"}>
                        {v.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    ยังไม่มีประวัติวัคซีน
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ผลการตรวจคัดกรองสุขภาพ</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ประเภท</TableHead>
                <TableHead>วันที่ตรวจ</TableHead>
                <TableHead>ผลตรวจ</TableHead>
                <TableHead>คำแนะนำ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {screenings.length > 0 ? (
                screenings.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{screeningTypeLabel[s.screening_type] ?? s.screening_type}</TableCell>
                    <TableCell>{new Date(s.screening_date).toLocaleDateString("th-TH")}</TableCell>
                    <TableCell>
                      <Badge variant={resultVariant[s.result]}>{resultLabel[s.result]}</Badge>
                    </TableCell>
                    <TableCell>{s.recommendation ?? "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    ยังไม่มีผลการตรวจคัดกรอง
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>การใช้ยาและการดูแลพิเศษ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {medications.length > 0 ? (
            medications.map((m) => (
              <div key={m.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {m.medication_name} {m.dosage ? `(${m.dosage})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">{m.schedule ?? "-"}</p>
                {m.special_care_notes && <p className="mt-1 text-xs text-destructive">{m.special_care_notes}</p>}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">ไม่มีรายการยา</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ผู้ติดต่อฉุกเฉิน</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {student!.emergency_contact_name ?? "ไม่ระบุ"}
            {student!.emergency_contact_relationship ? ` (${student!.emergency_contact_relationship})` : ""}
          </p>
          <p className="text-sm text-muted-foreground">{student!.emergency_contact_phone ?? "ไม่มีเบอร์ติดต่อ"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
