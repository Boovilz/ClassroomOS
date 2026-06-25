import { createClient } from "@/lib/supabase/server";
import { getRiskStudents } from "@/lib/queries/attendance";
import { getStudentAcademicSummary } from "@/lib/queries/academic";
import {
  type LevelRating,
  type RiskLevel,
  type WelfareStatus,
  levelRatingLabel,
  riskLevelLabel,
  welfareStatusLabel,
  buildMapsUrl,
} from "@/lib/queries/welfare-constants";

// Re-export so existing server-side imports of these from "@/lib/queries/welfare"
// keep working unchanged.
export type { LevelRating, RiskLevel, WelfareStatus };
export { levelRatingLabel, riskLevelLabel, welfareStatusLabel, buildMapsUrl };

async function getCurrentSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  return profile?.school_id ?? null;
}

// ============================================================================
// Home Visit Dashboard
// ============================================================================

export interface HomeVisitDashboardStats {
  totalStudents: number;
  homeVisitsCompleted: number;
  pendingHomeVisits: number;
  riskStudents: number;
  poorStudents: number;
  specialNeedsStudents: number;
  studentsRequiringAssistance: number;
  todayScheduledVisits: number;
}

export async function getHomeVisitDashboard(): Promise<HomeVisitDashboardStats> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: totalStudents },
    { count: completedCount },
    { count: pendingCount },
    { count: riskCount },
    { count: poorCount },
    { count: specialNeedsCount },
    { count: assistanceCount },
    { count: todayCount },
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null),
    supabase.from("home_visits").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("home_visits").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null).in("risk_level", ["medium", "high"]),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null).eq("poor_student_program", true),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null).not("learning_support_status", "is", null),
    supabase.from("student_assistance").select("id", { count: "exact", head: true }).in("status", ["eligible", "enrolled"]),
    supabase.from("home_visits").select("id", { count: "exact", head: true }).eq("visit_date", today),
  ]);

  return {
    totalStudents: totalStudents ?? 0,
    homeVisitsCompleted: completedCount ?? 0,
    pendingHomeVisits: pendingCount ?? 0,
    riskStudents: riskCount ?? 0,
    poorStudents: poorCount ?? 0,
    specialNeedsStudents: specialNeedsCount ?? 0,
    studentsRequiringAssistance: assistanceCount ?? 0,
    todayScheduledVisits: todayCount ?? 0,
  };
}

export interface VisitCompletionPoint {
  status: string;
  label: string;
  count: number;
}

export async function getVisitCompletionRate(): Promise<VisitCompletionPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("home_visits").select("status");

  const labels: Record<string, string> = {
    scheduled: "นัดหมายแล้ว",
    completed: "เยี่ยมแล้ว",
    cancelled: "ยกเลิก",
    rescheduled: "เลื่อนนัด",
  };
  const counts: Record<string, number> = { scheduled: 0, completed: 0, cancelled: 0, rescheduled: 0 };
  for (const row of data ?? []) {
    if (row.status && counts[row.status] !== undefined) counts[row.status]++;
  }
  return Object.entries(counts).map(([status, count]) => ({ status, label: labels[status], count }));
}

export interface RiskDistributionPoint {
  level: string;
  label: string;
  count: number;
}

export async function getStudentRiskDistribution(): Promise<RiskDistributionPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("risk_level").eq("is_active", true).is("deleted_at", null);

  const labels: Record<string, string> = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง", none: "ยังไม่ประเมิน" };
  const counts: Record<string, number> = { low: 0, medium: 0, high: 0, none: 0 };
  for (const row of data ?? []) {
    const key = row.risk_level ?? "none";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts).map(([level, count]) => ({ level, label: labels[level] ?? level, count }));
}

export interface IncomeDistributionPoint {
  bracket: string;
  count: number;
}

export async function getHouseholdIncomeAnalysis(): Promise<IncomeDistributionPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("family_income")
    .eq("is_active", true)
    .is("deleted_at", null)
    .not("family_income", "is", null);

  const brackets = [
    { label: "< 3,000", max: 3000 },
    { label: "3,000-6,000", max: 6000 },
    { label: "6,001-10,000", max: 10000 },
    { label: "10,001-20,000", max: 20000 },
    { label: "> 20,000", max: Infinity },
  ];
  const counts = brackets.map((b) => ({ bracket: b.label, count: 0 }));

  for (const row of data ?? []) {
    const income = row.family_income ?? 0;
    const idx = brackets.findIndex((b) => income <= b.max);
    if (idx >= 0) counts[idx].count++;
  }
  return counts;
}

export interface WelfareStatusPoint {
  status: string;
  label: string;
  count: number;
}

export async function getStudentWelfareStatusDistribution(): Promise<WelfareStatusPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("welfare_status").eq("is_active", true).is("deleted_at", null);

  const counts: Record<string, number> = { normal: 0, monitoring: 0, needs_support: 0, critical: 0, none: 0 };
  for (const row of data ?? []) {
    const key = row.welfare_status ?? "none";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts).map(([status, count]) => ({
    status,
    label: status === "none" ? "ยังไม่ประเมิน" : welfareStatusLabel[status as WelfareStatus],
    count,
  }));
}

// ============================================================================
// Home Visit Calendar / Scheduling
// ============================================================================

export interface HomeVisitCalendarRow {
  id: string;
  student_id: string;
  visit_date: string;
  visit_time: string | null;
  visit_type: string;
  status: string;
  purpose: string | null;
  follow_up_required: boolean;
  students: { full_name: string; student_code: string; classroom: string | null } | null;
}

export async function getHomeVisitCalendar(startDate: string, endDate: string): Promise<HomeVisitCalendarRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("home_visits")
    .select("id, student_id, visit_date, visit_time, visit_type, status, purpose, follow_up_required, students(full_name, student_code, classroom, deleted_at)")
    .gte("visit_date", startDate)
    .lte("visit_date", endDate)
    .order("visit_date", { ascending: true })
    .returns<(HomeVisitCalendarRow & { students: (HomeVisitCalendarRow["students"] & { deleted_at: string | null }) | null })[]>();
  return (data ?? []).filter((row) => !row.students || !row.students.deleted_at);
}

export async function scheduleHomeVisit(params: {
  schoolId: string;
  studentId: string;
  teacherId?: string | null;
  visitDate: string;
  visitTime?: string;
  visitType?: "routine" | "follow_up" | "emergency" | "poverty_screening" | "welfare_check";
  purpose?: string;
  createdBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("home_visits")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      teacher_id: params.teacherId ?? null,
      visit_date: params.visitDate,
      visit_time: params.visitTime ?? null,
      visit_type: params.visitType ?? "routine",
      purpose: params.purpose ?? null,
      status: "scheduled",
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Reminder notification, reusing Module 1/3's notifications table.
  if (params.createdBy) {
    await supabase.from("notifications").insert({
      school_id: params.schoolId,
      user_id: params.createdBy,
      title: "นัดหมายเยี่ยมบ้าน",
      body: `มีกำหนดเยี่ยมบ้านวันที่ ${params.visitDate}`,
      link: `/home-visits/${data.id}`,
    });
  }

  return data;
}

export async function rescheduleHomeVisit(visitId: string, newDate: string, newTime?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("home_visits")
    .update({ visit_date: newDate, visit_time: newTime ?? null, status: "rescheduled" })
    .eq("id", visitId);
  if (error) throw error;
}

export async function cancelHomeVisit(visitId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("home_visits").update({ status: "cancelled" }).eq("id", visitId);
  if (error) throw error;
}

// ============================================================================
// Home Visit Form - auto-load student / parent / household context
// ============================================================================

export interface HomeVisitFormContext {
  student: {
    id: string;
    full_name: string;
    student_code: string;
    classroom: string | null;
    grade: string | null;
    address: string | null;
    phone_number: string | null;
    emergency_contact_name: string | null;
    emergency_contact_relationship: string | null;
    emergency_contact_phone: string | null;
  } | null;
  parents: { id: string; full_name: string; relationship: string | null; phone: string | null; occupation: string | null }[];
}

export async function getHomeVisitFormContext(studentId: string): Promise<HomeVisitFormContext> {
  const supabase = await createClient();
  const [{ data: student }, { data: parents }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, full_name, student_code, classroom, grade, address, phone_number, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone"
      )
      .eq("id", studentId)
      .maybeSingle(),
    supabase.from("parents").select("id, full_name, relationship, phone, occupation").eq("student_id", studentId),
  ]);

  return { student: student ?? null, parents: parents ?? [] };
}

// ============================================================================
// Visit Details / full record + GPS
// ============================================================================

export interface HomeVisitDetailRow {
  id: string;
  school_id: string;
  student_id: string;
  teacher_id: string | null;
  visit_date: string;
  visit_time: string | null;
  visit_type: string;
  purpose: string | null;
  summary: string | null;
  family_situation: string | null;
  outcome: string | null;
  duration_minutes: number | null;
  follow_up_required: boolean;
  status: string;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  economic_status: string | null;
  educational_support: string | null;
  family_support: string | null;
  health_status_note: string | null;
  behavior_concerns: string | null;
  attendance_concerns: string | null;
  academic_concerns: string | null;
  created_at: string;
  updated_at: string;
  students: { full_name: string; student_code: string; classroom: string | null; grade: string | null; address: string | null } | null;
  teachers: { teacher_code: string | null } | null;
}

export async function getHomeVisitDetail(visitId: string) {
  const supabase = await createClient();
  const [{ data: visit }, { data: photos }, { data: documents }] = await Promise.all([
    supabase
      .from("home_visits")
      .select("*, students(full_name, student_code, classroom, grade, address), teachers(teacher_code)")
      .eq("id", visitId)
      .maybeSingle()
      .returns<HomeVisitDetailRow | null>(),
    supabase.from("home_visit_photos").select("*").eq("home_visit_id", visitId).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("home_visit_id", visitId).order("created_at", { ascending: false }),
  ]);
  return { visit: visit ?? null, photos: photos ?? [], documents: documents ?? [] };
}

export async function updateHomeVisit(
  visitId: string,
  changes: Partial<{
    summary: string;
    family_situation: string;
    purpose: string;
    outcome: string;
    duration_minutes: number;
    follow_up_required: boolean;
    status: "scheduled" | "completed" | "cancelled" | "rescheduled";
    latitude: number;
    longitude: number;
    economic_status: string;
    educational_support: string;
    family_support: string;
    health_status_note: string;
    behavior_concerns: string;
    attendance_concerns: string;
    academic_concerns: string;
  }>
) {
  const supabase = await createClient();
  const payload = { ...changes, maps_url: undefined as string | undefined };
  if (changes.latitude !== undefined && changes.longitude !== undefined) {
    payload.maps_url = buildMapsUrl(changes.latitude, changes.longitude);
  }

  const { data, error } = await supabase.from("home_visits").update(payload).eq("id", visitId).select().single();
  if (error) throw error;

  if (changes.status === "completed") {
    await supabase.from("students").update({ last_home_visit_at: data.visit_date }).eq("id", data.student_id);
  }

  return data;
}

export async function addHomeVisitPhoto(params: {
  schoolId: string;
  homeVisitId: string;
  photoUrl: string;
  category?: "house" | "study_area" | "family" | "other";
  caption?: string;
  uploadedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("home_visit_photos")
    .insert({
      school_id: params.schoolId,
      home_visit_id: params.homeVisitId,
      photo_url: params.photoUrl,
      category: params.category ?? "house",
      caption: params.caption ?? null,
      uploaded_by: params.uploadedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Household Information / Living Conditions Assessment
// ============================================================================

export async function getHouseholdProfile(studentId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from("household_profiles").select("*").eq("student_id", studentId).maybeSingle(),
    supabase.from("family_members").select("*").eq("student_id", studentId).order("created_at", { ascending: true }),
  ]);
  return { profile: profile ?? null, members: members ?? [] };
}

export async function upsertHouseholdProfile(params: {
  schoolId: string;
  studentId: string;
  housingOwnership?: "owned" | "rented" | "relative_owned" | "temporary" | "homeless";
  utilitiesAccess?: boolean;
  housingQuality?: LevelRating;
  sleepingArrangement?: LevelRating;
  studyEnvironment?: LevelRating;
  electricityWaterAccess?: LevelRating;
  sanitationCondition?: LevelRating;
  safetyCondition?: LevelRating;
  familySize?: number;
  householdAssets?: string;
  governmentAssistanceReceived?: string;
  assessedBy?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_profiles")
    .upsert(
      {
        school_id: params.schoolId,
        student_id: params.studentId,
        housing_ownership: params.housingOwnership ?? null,
        utilities_access: params.utilitiesAccess ?? null,
        housing_quality: params.housingQuality ?? null,
        sleeping_arrangement: params.sleepingArrangement ?? null,
        study_environment: params.studyEnvironment ?? null,
        electricity_water_access: params.electricityWaterAccess ?? null,
        sanitation_condition: params.sanitationCondition ?? null,
        safety_condition: params.safetyCondition ?? null,
        family_size: params.familySize ?? null,
        household_assets: params.householdAssets ?? null,
        government_assistance_received: params.governmentAssistanceReceived ?? null,
        assessed_by: params.assessedBy ?? null,
        notes: params.notes ?? null,
      },
      { onConflict: "school_id,student_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addFamilyMember(params: {
  schoolId: string;
  studentId: string;
  fullName: string;
  relationship: string;
  occupation?: string;
  monthlyIncome?: number;
  educationLevel?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("family_members")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      full_name: params.fullName,
      relationship: params.relationship,
      occupation: params.occupation ?? null,
      monthly_income: params.monthlyIncome ?? null,
      education_level: params.educationLevel ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Poor Student Screening
// ============================================================================

export interface PovertyScreeningResult {
  povertyRiskScore: number;
  eligibilityStatus: "eligible" | "not_eligible" | "pending_review";
  recommendations: string[];
}

/**
 * Rule-based poverty screening score (0-100, higher = more at-risk),
 * combining family income, family size, housing conditions, and existing
 * government assistance - same threshold-based style as
 * getAiFinancialAnalysis/getAiHealthAnalysis.
 */
export async function runPovertyScreening(studentId: string): Promise<PovertyScreeningResult> {
  const supabase = await createClient();
  const [{ data: student }, { profile }] = await Promise.all([
    supabase.from("students").select("family_income, family_members_count, housing_type, government_support_programs").eq("id", studentId).single(),
    getHouseholdProfile(studentId),
  ]);

  let score = 0;
  const recommendations: string[] = [];

  const income = student?.family_income ?? null;
  const familySize = student?.family_members_count ?? 1;
  const perCapitaIncome = income !== null && familySize > 0 ? income / familySize : null;

  if (perCapitaIncome !== null) {
    if (perCapitaIncome < 1000) {
      score += 40;
      recommendations.push("รายได้ต่อหัวต่ำกว่าเส้นความยากจน ควรเสนอเข้าโครงการช่วยเหลือเร่งด่วน");
    } else if (perCapitaIncome < 2500) {
      score += 25;
      recommendations.push("รายได้ต่อหัวอยู่ในเกณฑ์ต่ำ ควรพิจารณาทุนการศึกษาหรือเงินช่วยเหลือ");
    } else if (perCapitaIncome < 4000) {
      score += 10;
    }
  } else {
    score += 5;
    recommendations.push("ยังไม่มีข้อมูลรายได้ครอบครัว ควรเก็บข้อมูลให้ครบถ้วน");
  }

  if (familySize >= 6) {
    score += 15;
    recommendations.push("ครอบครัวมีสมาชิกจำนวนมาก อาจมีภาระค่าใช้จ่ายสูง ควรพิจารณาช่วยเหลือเพิ่มเติม");
  }

  if (student?.housing_type === "temporary" || profile?.housing_ownership === "homeless" || profile?.housing_ownership === "temporary") {
    score += 20;
    recommendations.push("สภาพที่อยู่อาศัยไม่มั่นคง ควรประสานหน่วยงานด้านที่อยู่อาศัย");
  }

  if (profile?.housing_quality === "needs_support" || profile?.sanitation_condition === "needs_support") {
    score += 10;
    recommendations.push("สภาพความเป็นอยู่ต้องการการช่วยเหลือด้านสุขอนามัยและความปลอดภัย");
  }

  if (!student?.government_support_programs) {
    score += 5;
    recommendations.push("ยังไม่ได้รับสวัสดิการจากรัฐ ควรตรวจสอบสิทธิ์และช่วยลงทะเบียน");
  }

  score = Math.min(100, score);

  let eligibilityStatus: PovertyScreeningResult["eligibilityStatus"] = "pending_review";
  if (score >= 40) eligibilityStatus = "eligible";
  else if (score < 15) eligibilityStatus = "not_eligible";

  if (recommendations.length === 0) {
    recommendations.push("สถานะเศรษฐกิจครอบครัวอยู่ในเกณฑ์ปกติ ไม่พบความเสี่ยงที่ชัดเจน");
  }

  await supabase
    .from("students")
    .update({ poverty_risk_score: score, risk_category: eligibilityStatus === "eligible" ? "poverty" : null })
    .eq("id", studentId);

  return { povertyRiskScore: score, eligibilityStatus, recommendations };
}

// ============================================================================
// Special Assistance Programs
// ============================================================================

export async function getAssistancePrograms(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("assistance_programs").select("*").eq("school_id", schoolId).eq("is_active", true).order("name");
  return data ?? [];
}

export async function createAssistanceProgram(params: {
  schoolId: string;
  name: string;
  programType: "scholarship" | "educational_grant" | "emergency_assistance" | "uniform_support" | "learning_materials";
  description?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistance_programs")
    .insert({ school_id: params.schoolId, name: params.name, program_type: params.programType, description: params.description ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getStudentAssistance(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_assistance")
    .select("*, assistance_programs(name, program_type)")
    .eq("student_id", studentId);
  return data ?? [];
}

export async function setStudentAssistance(params: {
  schoolId: string;
  studentId: string;
  programId: string;
  status: "eligible" | "not_eligible" | "pending_review" | "enrolled";
  amount?: number;
  reviewedBy?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_assistance")
    .upsert(
      {
        school_id: params.schoolId,
        student_id: params.studentId,
        program_id: params.programId,
        status: params.status,
        amount: params.amount ?? null,
        reviewed_by: params.reviewedBy ?? null,
        reviewed_at: new Date().toISOString(),
        notes: params.notes ?? null,
      },
      { onConflict: "student_id,program_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Student Risk Assessment / AI Risk Detection (rule-based, composes
// Module 3 attendance risk + Module 5 academic summary + health/welfare data
// already on `students` - no duplicated rate calculations).
// ============================================================================

export interface RiskScoreResult {
  riskLevel: RiskLevel;
  riskScore: number;
  factors: { domain: string; detail: string }[];
  recommendations: string[];
}

export async function getAiRiskScore(studentId: string): Promise<RiskScoreResult> {
  const supabase = await createClient();

  const [{ data: student }, riskStudents, academic, { data: alerts }, { data: behaviorRecords }] = await Promise.all([
    supabase
      .from("students")
      .select("full_name, family_income, family_members_count, poor_student_program, learning_support_status, risk_level")
      .eq("id", studentId)
      .single(),
    getRiskStudents(),
    getStudentAcademicSummary(studentId).catch(() => null),
    supabase.from("health_alerts").select("severity").eq("student_id", studentId).eq("is_resolved", false),
    supabase.from("behavior_records").select("points").eq("student_id", studentId).lt("points", 0),
  ]);

  const factors: RiskScoreResult["factors"] = [];
  const recommendations: string[] = [];
  let score = 0;

  // Attendance risk - reuse Module 3's getRiskStudents() output, no recompute.
  const attendanceRisk = riskStudents.find((r) => r.student_id === studentId);
  if (attendanceRisk) {
    if (attendanceRisk.risk_level === "high") {
      score += 30;
      factors.push({ domain: "การมาเรียน", detail: attendanceRisk.reason });
      recommendations.push("ติดตามการมาเรียนอย่างใกล้ชิดและประสานผู้ปกครอง");
    } else if (attendanceRisk.risk_level === "medium") {
      score += 15;
      factors.push({ domain: "การมาเรียน", detail: attendanceRisk.reason });
    }
  }

  // Academic risk - reuse Module 5's getStudentAcademicSummary(), no recompute.
  if (academic) {
    if (academic.gpa < 1.5) {
      score += 25;
      factors.push({ domain: "ผลการเรียน", detail: `GPA ต่ำ (${academic.gpa})` });
      recommendations.push("จัดสอนเสริมหรือติวเข้มในรายวิชาที่มีผลการเรียนต่ำ");
    } else if (academic.gpa < 2.5) {
      score += 10;
      factors.push({ domain: "ผลการเรียน", detail: `GPA อยู่ในเกณฑ์ปานกลาง (${academic.gpa})` });
    }
  }

  // Economic risk - reuse students.family_income/poor_student_program, no duplicate calc.
  const perCapita =
    student?.family_income !== null && student?.family_income !== undefined && (student?.family_members_count ?? 0) > 0
      ? student.family_income / (student!.family_members_count as number)
      : null;
  if (student?.poor_student_program || (perCapita !== null && perCapita < 1500)) {
    score += 20;
    factors.push({ domain: "เศรษฐกิจ", detail: "ครอบครัวมีรายได้น้อย/อยู่ในโครงการนักเรียนยากจน" });
    recommendations.push("เสนอทุนการศึกษาหรือเงินช่วยเหลือค่าใช้จ่ายด้านการเรียน");
  }

  // Health risk
  const unresolvedSevere = (alerts ?? []).filter((a) => a.severity === "high" || a.severity === "critical");
  if (unresolvedSevere.length > 0) {
    score += 15;
    factors.push({ domain: "สุขภาพ", detail: `มีการแจ้งเตือนสุขภาพระดับสูงที่ยังไม่ได้รับการแก้ไข ${unresolvedSevere.length} รายการ` });
    recommendations.push("ติดตามการรักษาและประสานหน่วยงานสาธารณสุข");
  }

  // Behavior risk
  const negativeBehaviorCount = (behaviorRecords ?? []).length;
  if (negativeBehaviorCount >= 5) {
    score += 15;
    factors.push({ domain: "พฤติกรรม", detail: `มีบันทึกพฤติกรรมเชิงลบ ${negativeBehaviorCount} ครั้ง` });
    recommendations.push("จัดให้คำปรึกษาด้านพฤติกรรมและติดตามอย่างใกล้ชิด");
  } else if (negativeBehaviorCount >= 2) {
    score += 5;
  }

  // Family/learning-support risk
  if (student?.learning_support_status) {
    score += 5;
    factors.push({ domain: "ครอบครัว/การเรียนรู้", detail: `ต้องการการสนับสนุนพิเศษด้านการเรียนรู้ (${student.learning_support_status})` });
  }

  score = Math.min(100, score);

  let riskLevel: RiskLevel = "low";
  if (score >= 60) riskLevel = "critical";
  else if (score >= 40) riskLevel = "high";
  else if (score >= 20) riskLevel = "moderate";

  if (recommendations.length === 0) {
    recommendations.push("ไม่พบความเสี่ยงเด่นชัดในขณะนี้ ควรติดตามตามรอบปกติ");
  }

  // Update the single derived snapshot on students (no separate history table,
  // matching the existing risk_level pattern from Module 3/0011).
  await supabase
    .from("students")
    .update({
      risk_level: riskLevel === "low" ? "low" : riskLevel === "moderate" ? "medium" : "high",
      welfare_status: riskLevel === "critical" ? "critical" : riskLevel === "high" ? "needs_support" : riskLevel === "moderate" ? "monitoring" : "normal",
    })
    .eq("id", studentId);

  return { riskLevel, riskScore: score, factors, recommendations };
}

// ============================================================================
// Intervention Management
// ============================================================================

export async function createInterventionPlan(params: {
  schoolId: string;
  studentId: string;
  caseId?: string;
  planType?: "support_plan" | "improvement_plan" | "follow_up_action";
  title: string;
  description?: string;
  responsibleStaff?: string;
  targetCompletionDate?: string;
  createdBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("intervention_plans")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      case_id: params.caseId ?? null,
      plan_type: params.planType ?? "support_plan",
      title: params.title,
      description: params.description ?? null,
      responsible_staff: params.responsibleStaff ?? null,
      target_completion_date: params.targetCompletionDate ?? null,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInterventionPlan(
  planId: string,
  changes: Partial<{ status: "open" | "in_progress" | "completed" | "cancelled"; progress_notes: string; target_completion_date: string }>
) {
  const supabase = await createClient();
  const payload = { ...changes, completed_at: undefined as string | undefined };
  if (changes.status === "completed") payload.completed_at = new Date().toISOString();
  const { data, error } = await supabase.from("intervention_plans").update(payload).eq("id", planId).select().single();
  if (error) throw error;
  return data;
}

export async function getStudentInterventionPlans(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("intervention_plans").select("*").eq("student_id", studentId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getInterventionSuccessRate(schoolId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("intervention_plans").select("status").eq("school_id", schoolId).neq("status", "cancelled");
  const rows = data ?? [];
  if (rows.length === 0) return 0;
  const completed = rows.filter((r) => r.status === "completed").length;
  return Math.round((completed / rows.length) * 100);
}

// ============================================================================
// Case Management System
// ============================================================================

export async function createStudentCase(params: {
  schoolId: string;
  studentId: string;
  title: string;
  concernType?: "welfare" | "academic" | "behavior" | "attendance" | "health" | "family";
  description?: string;
  openedBy?: string;
  assignedTo?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_cases")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      title: params.title,
      concern_type: params.concernType ?? "welfare",
      description: params.description ?? null,
      opened_by: params.openedBy ?? null,
      assigned_to: params.assignedTo ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudentCase(
  caseId: string,
  changes: Partial<{ status: "open" | "monitoring" | "resolved" | "closed"; resolution_notes: string; assigned_to: string }>
) {
  const supabase = await createClient();
  const payload = { ...changes, resolved_at: undefined as string | undefined };
  if (changes.status === "resolved" || changes.status === "closed") payload.resolved_at = new Date().toISOString();
  const { data, error } = await supabase.from("student_cases").update(payload).eq("id", caseId).select().single();
  if (error) throw error;
  return data;
}

export async function getStudentCases(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("student_cases").select("*").eq("student_id", studentId).order("created_at", { ascending: false });
  return data ?? [];
}

export interface OpenCaseRow {
  id: string;
  school_id: string;
  student_id: string;
  title: string;
  concern_type: string;
  description: string | null;
  status: string;
  created_at: string;
  students: { full_name: string; student_code: string; classroom: string | null } | null;
}

export async function getOpenCases(schoolId: string): Promise<OpenCaseRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_cases")
    .select("*, students(full_name, student_code, classroom, deleted_at)")
    .eq("school_id", schoolId)
    .in("status", ["open", "monitoring"])
    .order("created_at", { ascending: false })
    .returns<(OpenCaseRow & { students: (OpenCaseRow["students"] & { deleted_at: string | null }) | null })[]>();
  return (data ?? []).filter((row) => !row.students || !row.students.deleted_at);
}

// ============================================================================
// Parent Communication Log
// ============================================================================

export async function logParentCommunication(params: {
  schoolId: string;
  studentId: string;
  caseId?: string;
  homeVisitId?: string;
  communicationType?: "meeting" | "phone_call" | "line_message" | "home_visit_discussion" | "agreement";
  summary: string;
  agreements?: string;
  followUpAction?: string;
  followUpDate?: string;
  communicatedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_communications")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      case_id: params.caseId ?? null,
      home_visit_id: params.homeVisitId ?? null,
      communication_type: params.communicationType ?? "phone_call",
      summary: params.summary,
      agreements: params.agreements ?? null,
      follow_up_action: params.followUpAction ?? null,
      follow_up_date: params.followUpDate ?? null,
      communicated_by: params.communicatedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getParentCommunications(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("parent_communications").select("*").eq("student_id", studentId).order("occurred_at", { ascending: false });
  return data ?? [];
}

// ============================================================================
// Timeline view - merges home visits + cases + communications for a student.
// ============================================================================

export interface TimelineEvent {
  id: string;
  type: "home_visit" | "case" | "communication";
  date: string;
  title: string;
  detail: string | null;
}

export async function getStudentTimeline(studentId: string): Promise<TimelineEvent[]> {
  const [{ data: visits }, cases, communications] = await Promise.all([
    (await createClient()).from("home_visits").select("id, visit_date, purpose, summary").eq("student_id", studentId),
    getStudentCases(studentId),
    getParentCommunications(studentId),
  ]);

  const events: TimelineEvent[] = [
    ...(visits ?? []).map((v) => ({
      id: v.id,
      type: "home_visit" as const,
      date: v.visit_date,
      title: "เยี่ยมบ้าน",
      detail: v.purpose ?? v.summary ?? null,
    })),
    ...cases.map((c) => ({ id: c.id, type: "case" as const, date: c.created_at, title: c.title, detail: c.description })),
    ...communications.map((c) => ({ id: c.id, type: "communication" as const, date: c.occurred_at, title: c.communication_type, detail: c.summary })),
  ];

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ============================================================================
// Reports (computed on-demand - no stored "reports" table)
// ============================================================================

export async function getIndividualHomeVisitReport(visitId: string) {
  return getHomeVisitDetail(visitId);
}

export interface ClassroomWelfareSummaryRow {
  classroom: string;
  studentCount: number;
  visitsCompleted: number;
  riskCount: number;
  poorCount: number;
  assistanceCount: number;
}

export async function getClassroomWelfareSummary(): Promise<ClassroomWelfareSummaryRow[]> {
  const supabase = await createClient();
  const [{ data: students }, { data: visits }, { data: assistance }] = await Promise.all([
    supabase.from("students").select("id, classroom, risk_level, poor_student_program").eq("is_active", true).is("deleted_at", null),
    supabase.from("home_visits").select("student_id, status"),
    supabase.from("student_assistance").select("student_id, status").in("status", ["eligible", "enrolled"]),
  ]);

  const completedVisitStudents = new Set((visits ?? []).filter((v) => v.status === "completed").map((v) => v.student_id));
  const assistedStudents = new Set((assistance ?? []).map((a) => a.student_id));

  const byClassroom = new Map<string, ClassroomWelfareSummaryRow>();
  for (const s of students ?? []) {
    const classroom = s.classroom ?? "ไม่ระบุ";
    const row = byClassroom.get(classroom) ?? { classroom, studentCount: 0, visitsCompleted: 0, riskCount: 0, poorCount: 0, assistanceCount: 0 };
    row.studentCount++;
    if (completedVisitStudents.has(s.id)) row.visitsCompleted++;
    if (s.risk_level === "high" || s.risk_level === "medium") row.riskCount++;
    if (s.poor_student_program) row.poorCount++;
    if (assistedStudents.has(s.id)) row.assistanceCount++;
    byClassroom.set(classroom, row);
  }

  return Array.from(byClassroom.values()).sort((a, b) => a.classroom.localeCompare(b.classroom));
}

export async function getRiskStudentReport() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, student_code, classroom, risk_level, poverty_risk_score, welfare_status")
    .eq("is_active", true)
    .is("deleted_at", null)
    .in("risk_level", ["medium", "high"])
    .order("risk_level", { ascending: false });
  return data ?? [];
}

export async function getAssistanceReport(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_assistance")
    .select("*, students(full_name, student_code, classroom, deleted_at), assistance_programs(name, program_type)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  return (data ?? []).filter((row) => !(row as { students: { deleted_at: string | null } | null }).students?.deleted_at);
}

// ============================================================================
// AI Home Visit Analysis (rule-based, no external LLM call)
// ============================================================================

export async function getAiHomeVisitAnalysis(visitId: string): Promise<string[]> {
  const { visit } = await getHomeVisitDetail(visitId);
  const insights: string[] = [];
  if (!visit) {
    insights.push("ไม่พบข้อมูลการเยี่ยมบ้าน");
    return insights;
  }

  const studentName = visit.students?.full_name ?? "นักเรียน";

  if (visit.status !== "completed") {
    insights.push(`การเยี่ยมบ้านของ${studentName}ยังไม่เสร็จสมบูรณ์ (สถานะ: ${visit.status}) ควรติดตามให้แล้วเสร็จ`);
  }

  if (visit.economic_status) {
    insights.push(`สถานะเศรษฐกิจ: ${visit.economic_status}`);
  }
  if (visit.family_support) {
    insights.push(`การสนับสนุนจากครอบครัว: ${visit.family_support}`);
  }
  if (visit.attendance_concerns) {
    insights.push(`ข้อสังเกตด้านการมาเรียน: ${visit.attendance_concerns} ควรประสานครูประจำชั้นติดตามต่อ`);
  }
  if (visit.academic_concerns) {
    insights.push(`ข้อสังเกตด้านผลการเรียน: ${visit.academic_concerns} ควรจัดสอนเสริมหากจำเป็น`);
  }
  if (visit.behavior_concerns) {
    insights.push(`ข้อสังเกตด้านพฤติกรรม: ${visit.behavior_concerns} ควรให้คำปรึกษาเพิ่มเติม`);
  }
  if (visit.follow_up_required) {
    insights.push(`${studentName}ต้องมีการติดตามเยี่ยมบ้านครั้งต่อไป ควรกำหนดวันนัดหมายล่วงหน้า`);
  }

  if (insights.length === 0) {
    insights.push(`การเยี่ยมบ้านของ${studentName}ไม่พบประเด็นที่ต้องติดตามเป็นพิเศษ`);
  }

  return insights;
}

// ============================================================================
// Student Welfare Dashboard
// ============================================================================

export interface WelfareDashboardStats {
  riskStudents: number;
  scholarshipStudents: number;
  studentsReceivingAssistance: number;
  studentsRequiringFollowUp: number;
  pendingCases: number;
  interventionSuccessRate: number;
}

export async function getWelfareDashboard(schoolId: string): Promise<WelfareDashboardStats> {
  const supabase = await createClient();
  const [{ count: riskCount }, { count: scholarshipCount }, { count: assistanceCount }, { count: followUpCount }, { count: pendingCases }, successRate] =
    await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true).is("deleted_at", null).in("risk_level", ["medium", "high"]),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true).is("deleted_at", null).not("scholarship_status", "is", null),
      supabase.from("student_assistance").select("id", { count: "exact", head: true }).eq("school_id", schoolId).in("status", ["eligible", "enrolled"]),
      supabase.from("home_visits").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("follow_up_required", true),
      supabase.from("student_cases").select("id", { count: "exact", head: true }).eq("school_id", schoolId).in("status", ["open", "monitoring"]),
      getInterventionSuccessRate(schoolId),
    ]);

  return {
    riskStudents: riskCount ?? 0,
    scholarshipStudents: scholarshipCount ?? 0,
    studentsReceivingAssistance: assistanceCount ?? 0,
    studentsRequiringFollowUp: followUpCount ?? 0,
    pendingCases: pendingCases ?? 0,
    interventionSuccessRate: successRate,
  };
}

// ============================================================================
// Analytics
// ============================================================================

export async function getWelfareAnalytics(schoolId: string) {
  const [incomeDistribution, riskDistribution, visitCompletion, classroomComparison, interventionSuccessRate] = await Promise.all([
    getHouseholdIncomeAnalysis(),
    getStudentRiskDistribution(),
    getVisitCompletionRate(),
    getClassroomWelfareSummary(),
    getInterventionSuccessRate(schoolId),
  ]);
  return { incomeDistribution, riskDistribution, visitCompletion, classroomComparison, interventionSuccessRate };
}

export { getCurrentSchoolId };
