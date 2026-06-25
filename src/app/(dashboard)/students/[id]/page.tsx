import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudentAiSummary } from "@/lib/queries/students";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { Button } from "@/components/ui/button";
import { LearningOutcomesTracker } from "@/components/academic/learning-outcomes-tracker";
import { getLearningOutcomes } from "@/lib/queries/academic";
import { getStudentCases, getStudentInterventionPlans, getParentCommunications } from "@/lib/queries/welfare";
import { RiskAssessmentCard } from "@/components/home-visits/risk-assessment-card";
import { CreateCaseDialog } from "@/components/home-visits/create-case-dialog";
import { LogCommunicationDialog } from "@/components/home-visits/log-communication-dialog";
import { getAiGeneratedContent } from "@/lib/queries/ai";
import { getStudentRiskScore } from "@/lib/queries/risk-score";
import { getStudentAttendanceAnalytics } from "@/lib/queries/attendance";
import { getStudentXpTransactions, getStudentCoinTransactions } from "@/lib/queries/behavior";
import { RiskScoreCard } from "@/components/students/risk-score-card";

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
const interventionStatusLabel: Record<string, string> = {
  open: "เปิด",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const genderLabel: Record<string, string> = { male: "ชาย", female: "หญิง", other: "อื่นๆ" };
const riskLabel: Record<string, string> = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง" };
const riskVariant: Record<string, "success" | "secondary" | "destructive"> = {
  low: "success",
  medium: "secondary",
  high: "destructive",
};
const attendanceStatusLabel: Record<string, string> = {
  present: "มา",
  late: "มาสาย",
  sick: "ลาป่วย",
  personal_leave: "ลากิจ",
  absent: "ขาด",
};
const attendanceStatusColor: Record<string, string> = {
  present: "bg-emerald-green",
  late: "bg-amber-500",
  sick: "bg-sky-500",
  personal_leave: "bg-violet-500",
  absent: "bg-destructive",
};

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", id).single();

  if (!student) {
    notFound();
  }

  const [
    { data: parents },
    { data: health },
    { data: scores },
    { data: behaviorRecords },
    { data: attendance },
    { data: avatar },
    { data: achievements },
    { data: financeTransactions },
    { data: homeVisits },
    { data: sdqAssessments },
    { data: documents },
    { data: mealRecords },
    { data: mealEligibility },
    aiSummary,
    studentCases,
    interventionPlans,
    parentCommunications,
    aiInsights,
    riskScore,
    attendanceAnalytics,
    xpTransactions,
    coinTransactions,
  ] = await Promise.all([
    supabase.from("parents").select("*").eq("student_id", id),
    supabase.from("health_records").select("*").eq("student_id", id).order("recorded_at", { ascending: false }).limit(10),
    supabase
      .from("scores")
      .select("score, max_score, term, subjects(name)")
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<
        { score: number; max_score: number; term: string | null; subjects: { name: string } | null }[]
      >(),
    supabase
      .from("behavior_records")
      .select("title, points, category, occurred_at")
      .eq("student_id", id)
      .order("occurred_at", { ascending: false })
      .limit(20),
    supabase
      .from("attendance")
      .select("status, date")
      .eq("student_id", id)
      .order("date", { ascending: false })
      .limit(60),
    supabase.from("student_avatars").select("*").eq("student_id", id).maybeSingle(),
    supabase
      .from("student_achievements")
      .select("awarded_at, achievements(title, description, icon, xp_reward, coin_reward)")
      .eq("student_id", id)
      .order("awarded_at", { ascending: false })
      .returns<
        {
          awarded_at: string;
          achievements: { title: string; description: string | null; icon: string | null; xp_reward: number; coin_reward: number } | null;
        }[]
      >(),
    supabase
      .from("finance_transactions")
      .select("type, category, amount, description, occurred_at")
      .eq("student_id", id)
      .order("occurred_at", { ascending: false })
      .limit(20),
    supabase.from("home_visits").select("*").eq("student_id", id).order("visit_date", { ascending: false }),
    supabase.from("sdq_assessments").select("*").eq("student_id", id).order("assessment_date", { ascending: false }),
    supabase.from("documents").select("*").eq("student_id", id).order("created_at", { ascending: false }),
    supabase
      .from("meal_records")
      .select("date, meal_type, status, notes")
      .eq("student_id", id)
      .order("date", { ascending: false })
      .limit(20),
    supabase.from("meal_eligibility").select("*").eq("student_id", id).maybeSingle(),
    getStudentAiSummary(id),
    getStudentCases(id),
    getStudentInterventionPlans(id),
    getParentCommunications(id),
    getAiGeneratedContent(student?.school_id ?? "", undefined, 5).then((rows) =>
      rows.filter((r) => r.student_id === id)
    ),
    getStudentRiskScore(id),
    getStudentAttendanceAnalytics(id),
    getStudentXpTransactions(id),
    getStudentCoinTransactions(id),
  ]);

  const learningOutcomes = await getLearningOutcomes(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={student.profile_picture_url ?? student.avatar_url ?? undefined} />
          <AvatarFallback className="text-xl">{student.full_name?.[0] ?? "น"}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{student.full_name}</h1>
          <p className="text-muted-foreground">
            รหัสนักเรียน: {student.student_code} {student.nickname ? `(${student.nickname})` : ""} ·{" "}
            {student.classroom ?? "-"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {student.risk_level && (
            <Badge variant={riskVariant[student.risk_level]}>ความเสี่ยง: {riskLabel[student.risk_level]}</Badge>
          )}
          <Badge variant={student.is_archived ? "outline" : student.is_active ? "success" : "outline"}>
            {student.is_archived ? "เก็บถาวร" : student.is_active ? "กำลังศึกษา" : "ไม่ได้ศึกษา"}
          </Badge>
        </div>
        <StudentFormDialog
          schoolId={student.school_id}
          initialValues={{
            id: student.id,
            student_code: student.student_code,
            title: student.title ?? "",
            full_name: student.full_name,
            full_name_en: student.full_name_en ?? "",
            nickname: student.nickname ?? "",
            gender: student.gender ?? undefined,
            birth_date: student.birth_date ?? "",
            citizen_id: student.citizen_id ?? "",
            nationality: student.nationality ?? "",
            religion: student.religion ?? "",
            blood_type: student.blood_type ?? "",
            phone_number: student.phone_number ?? "",
            address: student.address ?? "",
            province: student.province ?? "",
            district: student.district ?? "",
            subdistrict: student.subdistrict ?? "",
            postal_code: student.postal_code ?? "",
            emergency_contact_name: student.emergency_contact_name ?? "",
            emergency_contact_relationship: student.emergency_contact_relationship ?? "",
            emergency_contact_phone: student.emergency_contact_phone ?? "",
            grade: student.grade ?? "",
            classroom: student.classroom ?? "",
            student_number: student.student_number ?? "",
            enrollment_date: student.enrollment_date ?? "",
            graduation_status: student.graduation_status ?? "",
            learning_support_status: student.learning_support_status ?? "",
            scholarship_status: student.scholarship_status ?? "",
            risk_level: student.risk_level ?? undefined,
            risk_category: student.risk_category ?? "",
            family_income: student.family_income?.toString() ?? "",
            family_members_count: student.family_members_count?.toString() ?? "",
            housing_type: student.housing_type ?? "",
            internet_access: student.internet_access ?? undefined,
            device_ownership: student.device_ownership ?? "",
            transportation_method: student.transportation_method ?? "",
            poor_student_program: student.poor_student_program ?? false,
            government_support_programs: student.government_support_programs ?? "",
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">ระดับ / XP / เหรียญ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              Lv.{student.level} · {student.xp} XP · {student.coins} เหรียญ
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">วันเกิด</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{student.birth_date ?? "-"}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">เพศ / กรุ๊ปเลือด</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              {student.gender ? genderLabel[student.gender] ?? "-" : "-"} · {student.blood_type ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="parents">ผู้ปกครอง</TabsTrigger>
          <TabsTrigger value="academic">ผลการเรียน</TabsTrigger>
          <TabsTrigger value="attendance">การเข้าเรียน</TabsTrigger>
          <TabsTrigger value="behavior">พฤติกรรม</TabsTrigger>
          <TabsTrigger value="rewards">XP & รางวัล</TabsTrigger>
          <TabsTrigger value="finance">การเงิน</TabsTrigger>
          <TabsTrigger value="health">สุขภาพ</TabsTrigger>
          <TabsTrigger value="nutrition">อาหารกลางวัน</TabsTrigger>
          <TabsTrigger value="home-visits">เยี่ยมบ้าน</TabsTrigger>
          <TabsTrigger value="sdq">SDQ</TabsTrigger>
          <TabsTrigger value="documents">เอกสาร</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>คะแนนความเสี่ยงโดยรวม</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskScoreCard riskScore={riskScore} />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ที่อยู่และข้อมูลทั่วไป</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>ที่อยู่: {student.address ?? "-"}</p>
              <p>
                ตำบล/อำเภอ/จังหวัด: {student.subdistrict ?? "-"} / {student.district ?? "-"} / {student.province ?? "-"}{" "}
                {student.postal_code ?? ""}
              </p>
              <p>เลขประจำตัวประชาชน: {student.citizen_id ?? "-"}</p>
              <p>สัญชาติ/ศาสนา: {student.nationality ?? "-"} / {student.religion ?? "-"}</p>
              <p>เบอร์โทรศัพท์: {student.phone_number ?? "-"}</p>
              <p>
                ผู้ติดต่อฉุกเฉิน: {student.emergency_contact_name ?? "-"} ({student.emergency_contact_relationship ?? "-"}) ·{" "}
                {student.emergency_contact_phone ?? "-"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parents">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ข้อมูลผู้ปกครอง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {parents && parents.length > 0 ? (
                parents.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border/60 p-3 text-sm">
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-muted-foreground">
                      {p.relationship ?? "-"} · {p.phone ?? "-"} · {p.email ?? "-"} · {p.occupation ?? "-"}
                    </p>
                    <p className="text-muted-foreground">
                      รายได้: {p.income ? `${Number(p.income).toLocaleString()} บาท/เดือน` : "-"} · LINE: {p.line_id ?? "-"}
                    </p>
                    {p.address && <p className="text-muted-foreground">ที่อยู่: {p.address}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลผู้ปกครอง</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ผลการเรียนล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scores && scores.length > 0 ? (
                scores.map((s, i) => {
                  const subject = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects;
                  return (
                    <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                      <span>
                        {subject?.name ?? "-"} ({s.term ?? "-"})
                      </span>
                      <span className="font-medium">
                        {s.score} / {s.max_score}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีผลการเรียน</p>
              )}
            </CardContent>
          </Card>

          <LearningOutcomesTracker
            outcomes={(
              learningOutcomes as unknown as {
                status: string;
                learning_standards: { code: string; description: string } | null;
              }[]
            ).map((o) => ({
              code: o.learning_standards?.code ?? "-",
              description: o.learning_standards?.description ?? "-",
              status: o.status,
            }))}
          />

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>เอกสารผลการเรียน</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/students/${id}/report-card`}>สมุดรายงานผลการเรียน</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/students/${id}/pp5`}>ปพ.5</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/students/${id}/pp6`}>ปพ.6</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">อัตราการมาเรียน (60 วัน)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{attendanceAnalytics.attendanceRate}%</p>
                {attendanceAnalytics.trendDelta !== null && (
                  <p className={`text-sm ${attendanceAnalytics.trendDelta >= 0 ? "text-success" : "text-destructive"}`}>
                    {attendanceAnalytics.trendDelta >= 0 ? "+" : ""}
                    {attendanceAnalytics.trendDelta}% เทียบกับ 60 วันก่อนหน้า
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">ขาดเรียนต่อเนื่อง</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{attendanceAnalytics.currentAbsentStreak} วัน</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">สรุปสถานะ (60 วัน)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5 text-sm">
                <p>มา {attendanceAnalytics.statusCounts.present} · มาสาย {attendanceAnalytics.statusCounts.late}</p>
                <p>
                  ลาป่วย {attendanceAnalytics.statusCounts.sick} · ลากิจ {attendanceAnalytics.statusCounts.personal_leave} · ขาด{" "}
                  {attendanceAnalytics.statusCounts.absent}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>แผนภูมิการเข้าเรียน (60 วันล่าสุด)</CardTitle>
            </CardHeader>
            <CardContent>
              {attendance && attendance.length > 0 ? (
                <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-15">
                  {attendance
                    .slice()
                    .reverse()
                    .map((a, i) => (
                      <div
                        key={i}
                        title={`${a.date}: ${attendanceStatusLabel[a.status] ?? a.status}`}
                        className={`h-6 w-6 rounded ${attendanceStatusColor[a.status] ?? "bg-muted"}`}
                      />
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการเข้าเรียน</p>
              )}
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ประวัติการเข้าเรียนล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attendance && attendance.length > 0 ? (
                attendance.slice(0, 15).map((a, i) => (
                  <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                    <span>{a.date}</span>
                    <Badge variant="outline">{attendanceStatusLabel[a.status] ?? a.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการเข้าเรียน</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>บันทึกพฤติกรรมล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {behaviorRecords && behaviorRecords.length > 0 ? (
                behaviorRecords.map((log, i) => (
                  <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                    <span>{log.title}</span>
                    <Badge variant={log.category === "positive" ? "success" : "destructive"}>
                      {log.points > 0 ? "+" : ""}
                      {log.points}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกพฤติกรรม</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ระดับและไอเทมที่สวมใส่</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Lv.{student.level} · {student.xp} XP · {student.coins} เหรียญ
              </p>
              {avatar ? (
                <>
                  <p>ทรงผม: {avatar.equipped_hair ?? "ค่าเริ่มต้น"}</p>
                  <p>เครื่องแบบ: {avatar.equipped_uniform ?? "ค่าเริ่มต้น"}</p>
                  <p>ของประดับ: {avatar.equipped_accessory ?? "-"}</p>
                  <p>พื้นหลัง: {avatar.equipped_background ?? "default_bg"}</p>
                  <p>กรอบ: {avatar.equipped_frame ?? "-"}</p>
                </>
              ) : (
                <p className="text-muted-foreground">ยังไม่มีการตั้งค่าอวาตาร์ (ใช้ค่าเริ่มต้น)</p>
              )}
              {/* TODO: full avatar shop / equip UI — out of scope for this pass */}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>ประวัติ XP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {xpTransactions.length > 0 ? (
                  xpTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                      <div>
                        <p>{t.reason}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("th-TH")}</p>
                      </div>
                      <span className={t.amount >= 0 ? "font-medium text-success" : "font-medium text-destructive"}>
                        {t.amount >= 0 ? "+" : ""}
                        {t.amount} XP
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีประวัติ XP</p>
                )}
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>ประวัติเหรียญ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {coinTransactions.length > 0 ? (
                  coinTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                      <div>
                        <p>{t.reason}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("th-TH")}</p>
                      </div>
                      <span className={t.amount >= 0 ? "font-medium text-success" : "font-medium text-destructive"}>
                        {t.amount >= 0 ? "+" : ""}
                        {t.amount} เหรียญ
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีประวัติเหรียญ</p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>เหรียญรางวัล/ความสำเร็จ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {achievements && achievements.length > 0 ? (
                achievements.map((a, i) => (
                  <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                    <span>{a.achievements?.title ?? "-"}</span>
                    <span className="text-muted-foreground">{new Date(a.awarded_at).toLocaleDateString("th-TH")}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีความสำเร็จที่ได้รับ</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ธุรกรรมการเงินที่เกี่ยวข้อง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {financeTransactions && financeTransactions.length > 0 ? (
                financeTransactions.map((t, i) => (
                  <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                    <span>
                      {t.category ?? (t.type === "income" ? "รายรับ" : "รายจ่าย")} · {t.occurred_at}
                    </span>
                    <span className={t.type === "income" ? "text-emerald-green font-medium" : "text-destructive font-medium"}>
                      {t.type === "income" ? "+" : "-"}
                      {Number(t.amount).toLocaleString()} บาท
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีธุรกรรมการเงินที่เกี่ยวข้องกับนักเรียนคนนี้</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>บันทึกสุขภาพล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {health && health.length > 0 ? (
                health.map((h) => (
                  <div key={h.id} className="rounded-xl border border-border/60 p-3 text-sm">
                    <p>
                      ส่วนสูง {h.height_cm ?? "-"} ซม. · น้ำหนัก {h.weight_kg ?? "-"} กก. · สายตา {h.vision_left ?? "-"}/{h.vision_right ?? "-"}
                    </p>
                    <p className="text-muted-foreground">
                      บันทึกเมื่อ {h.recorded_at} {h.allergies ? `· แพ้: ${h.allergies}` : ""}
                      {h.chronic_conditions ? ` · โรคประจำตัว: ${h.chronic_conditions}` : ""}
                    </p>
                    {h.notes && <p className="text-muted-foreground">หมายเหตุ: {h.notes}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกสุขภาพ</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutrition" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>สิทธิ์อาหารกลางวัน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {mealEligibility ? (
                <>
                  <p>ประเภทโครงการ: {mealEligibility.program_type ?? "-"}</p>
                  <p>สถานะ: {mealEligibility.status ?? "-"}</p>
                  {mealEligibility.meal_restrictions && <p>ข้อจำกัดด้านอาหาร: {mealEligibility.meal_restrictions}</p>}
                </>
              ) : (
                <p className="text-muted-foreground">ยังไม่มีข้อมูลสิทธิ์อาหารกลางวัน</p>
              )}
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ประวัติการรับอาหารล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mealRecords && mealRecords.length > 0 ? (
                mealRecords.map((m, i) => (
                  <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                    <span>
                      {m.date} · {m.meal_type}
                    </span>
                    <Badge variant={m.status === "served" ? "success" : "outline"}>{m.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการรับอาหาร</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="home-visits" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ประวัติการเยี่ยมบ้าน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {homeVisits && homeVisits.length > 0 ? (
                homeVisits.map((v) => (
                  <Link key={v.id} href={`/home-visits/${v.id}`} className="block">
                    <div className="rounded-xl border border-border/60 p-3 text-sm transition hover:bg-accent/40">
                      <p className="font-medium">{v.visit_date}</p>
                      <p className="text-muted-foreground">{v.summary ?? "-"}</p>
                      {v.family_situation && <p className="text-muted-foreground">สถานการณ์ครอบครัว: {v.family_situation}</p>}
                      {v.follow_up_required && <Badge variant="secondary">ต้องติดตามต่อ</Badge>}
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกการเยี่ยมบ้าน</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ประเมินความเสี่ยงนักเรียน (AI)</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskAssessmentCard studentId={id} />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>กรณีที่ติดตาม (Case Management)</CardTitle>
              <CreateCaseDialog schoolId={student.school_id} studentId={id} />
            </CardHeader>
            <CardContent className="space-y-2">
              {studentCases.length > 0 ? (
                studentCases.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      {c.description && <p className="text-muted-foreground">{c.description}</p>}
                    </div>
                    <Badge variant={caseStatusVariant[c.status] ?? "default"}>{caseStatusLabel[c.status] ?? c.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ไม่มีเคสที่ติดตาม</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>แผนช่วยเหลือ (Intervention Plans)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {interventionPlans.length > 0 ? (
                interventionPlans.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      {p.description && <p className="text-muted-foreground">{p.description}</p>}
                      {p.responsible_staff && <p className="text-xs text-muted-foreground">ผู้รับผิดชอบ: {p.responsible_staff}</p>}
                    </div>
                    <Badge variant="outline">{interventionStatusLabel[p.status] ?? p.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีแผนช่วยเหลือ</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>บันทึกการสื่อสารกับผู้ปกครอง</CardTitle>
              <LogCommunicationDialog schoolId={student.school_id} studentId={id} />
            </CardHeader>
            <CardContent className="space-y-2">
              {parentCommunications.length > 0 ? (
                parentCommunications.map((pc) => (
                  <div key={pc.id} className="rounded-xl border border-border/60 p-3 text-sm">
                    <p className="font-medium">{pc.summary}</p>
                    {pc.agreements && <p className="text-muted-foreground">ข้อตกลง: {pc.agreements}</p>}
                    {pc.follow_up_action && <p className="text-muted-foreground">การติดตามต่อ: {pc.follow_up_action}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกการสื่อสาร</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sdq" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>สรุปข้อมูลโดย AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{aiSummary.academicSummary}</p>
              <p>{aiSummary.attendanceSummary}</p>
              <p>{aiSummary.behaviorSummary}</p>
              <p>{aiSummary.healthSummary}</p>
              <p className="font-medium">คำแนะนำการติดต่อผู้ปกครอง: {aiSummary.parentCommunicationSuggestion}</p>
              <p className="font-medium">แนวทางการช่วยเหลือที่แนะนำ: {aiSummary.recommendedIntervention}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>แบบประเมิน SDQ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sdqAssessments && sdqAssessments.length > 0 ? (
                sdqAssessments.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border/60 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{s.assessment_date}</p>
                      {s.risk_level && (
                        <Badge
                          variant={
                            s.risk_level === "high_risk" || s.risk_level === "critical"
                              ? "destructive"
                              : s.risk_level === "borderline" || s.risk_level === "at_risk"
                                ? "secondary"
                                : "success"
                          }
                        >
                          {s.risk_level}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      คะแนนรวมความยาก: {s.total_difficulties_score ?? "-"} · อารมณ์ {s.emotional_score ?? "-"} · ความประพฤติ{" "}
                      {s.conduct_score ?? "-"} · ไฮเปอร์ {s.hyperactivity_score ?? "-"} · เพื่อน {s.peer_problems_score ?? "-"} ·
                      สังคม {s.prosocial_score ?? "-"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีแบบประเมิน SDQ</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>เอกสารของนักเรียน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents && documents.length > 0 ? (
                documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-muted-foreground">{d.category ?? "ไม่ระบุหมวดหมู่"}</p>
                    </div>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        เปิดเอกสาร
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีเอกสาร</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>ข้อมูลเชิงลึกจาก AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiInsights.length > 0 ? (
                aiInsights.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/60 p-3 text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground">{item.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.content_type} · {new Date(item.created_at).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลเชิงลึกจาก AI สำหรับนักเรียนคนนี้</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
