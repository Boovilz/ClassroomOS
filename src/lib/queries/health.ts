import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Helpers
// ============================================================================

export type NutritionStatus = "severely_underweight" | "underweight" | "normal" | "overweight" | "obese";

export const nutritionStatusLabel: Record<NutritionStatus, string> = {
  severely_underweight: "ผอมมาก",
  underweight: "ผอม",
  normal: "ปกติ",
  overweight: "น้ำหนักเกิน",
  obese: "อ้วน",
};

/**
 * Computes BMI (kg/m^2) and a category appropriate for school-age children
 * using simple WHO-style adult/adolescent BMI cutoffs (the codebase does not
 * have age/sex-specific growth charts, so this uses the standard adult BMI
 * bands which is an accepted simplification for a school health dashboard).
 */
export function calculateBmi(weightKg: number, heightCm: number): { bmi: number; status: NutritionStatus } {
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? weightKg / (heightM * heightM) : 0;
  const rounded = Math.round(bmi * 10) / 10;

  let status: NutritionStatus;
  if (rounded < 16) status = "severely_underweight";
  else if (rounded < 18.5) status = "underweight";
  else if (rounded < 23) status = "normal";
  else if (rounded < 27.5) status = "overweight";
  else status = "obese";

  return { bmi: rounded, status };
}

async function getCurrentSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  return profile?.school_id ?? null;
}

// ============================================================================
// Health dashboard
// ============================================================================

export interface HealthDashboardStats {
  totalStudents: number;
  healthyCount: number;
  underweightCount: number;
  overweightCount: number;
  obeseCount: number;
  medicalConditionCount: number;
  allergyCount: number;
  vaccinationCompletionRate: number;
  todayAlertCount: number;
}

export async function getHealthDashboard(): Promise<HealthDashboardStats> {
  const supabase = await createClient();

  const [{ data: students }, { data: latestRecords }, { count: conditionCount }, { count: allergyCount }, { data: vaccinations }, { data: todayAlerts }] =
    await Promise.all([
      supabase.from("students").select("id").eq("is_active", true),
      supabase
        .from("health_records")
        .select("student_id, nutrition_status, recorded_at")
        .order("recorded_at", { ascending: false }),
      supabase.from("medical_conditions").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("allergies").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("vaccinations").select("student_id, status"),
      supabase.from("health_alerts").select("id").eq("is_resolved", false).gte("created_at", new Date().toISOString().slice(0, 10)),
    ]);

  const totalStudents = students?.length ?? 0;

  // Keep only the latest record per student.
  const latestByStudent = new Map<string, NutritionStatus | null>();
  for (const r of latestRecords ?? []) {
    if (!latestByStudent.has(r.student_id)) {
      latestByStudent.set(r.student_id, r.nutrition_status as NutritionStatus | null);
    }
  }

  let healthyCount = 0;
  let underweightCount = 0;
  let overweightCount = 0;
  let obeseCount = 0;
  for (const status of latestByStudent.values()) {
    if (status === "normal") healthyCount++;
    else if (status === "underweight" || status === "severely_underweight") underweightCount++;
    else if (status === "overweight") overweightCount++;
    else if (status === "obese") obeseCount++;
  }

  const studentsWithVaccination = new Set((vaccinations ?? []).filter((v) => v.status === "completed").map((v) => v.student_id));
  const vaccinationCompletionRate = totalStudents > 0 ? Math.round((studentsWithVaccination.size / totalStudents) * 100) : 0;

  return {
    totalStudents,
    healthyCount,
    underweightCount,
    overweightCount,
    obeseCount,
    medicalConditionCount: conditionCount ?? 0,
    allergyCount: allergyCount ?? 0,
    vaccinationCompletionRate,
    todayAlertCount: todayAlerts?.length ?? 0,
  };
}

export interface BmiDistributionPoint {
  status: NutritionStatus;
  label: string;
  count: number;
}

export async function getBmiDistribution(): Promise<BmiDistributionPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("health_records").select("student_id, nutrition_status, recorded_at").order("recorded_at", { ascending: false });

  const latestByStudent = new Map<string, NutritionStatus | null>();
  for (const r of data ?? []) {
    if (!latestByStudent.has(r.student_id)) {
      latestByStudent.set(r.student_id, r.nutrition_status as NutritionStatus | null);
    }
  }

  const counts: Record<NutritionStatus, number> = {
    severely_underweight: 0,
    underweight: 0,
    normal: 0,
    overweight: 0,
    obese: 0,
  };
  for (const status of latestByStudent.values()) {
    if (status) counts[status]++;
  }

  return (Object.keys(counts) as NutritionStatus[]).map((status) => ({
    status,
    label: nutritionStatusLabel[status],
    count: counts[status],
  }));
}

export interface VaccinationCoveragePoint {
  vaccineName: string;
  completed: number;
  total: number;
  rate: number;
}

export async function getVaccinationCoverage(): Promise<VaccinationCoveragePoint[]> {
  const supabase = await createClient();
  const [{ data: vaccinations }, { count: totalStudents }] = await Promise.all([
    supabase.from("vaccinations").select("vaccine_name, status"),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const byVaccine = new Map<string, number>();
  for (const v of vaccinations ?? []) {
    if (v.status !== "completed") continue;
    byVaccine.set(v.vaccine_name, (byVaccine.get(v.vaccine_name) ?? 0) + 1);
  }

  const total = totalStudents ?? 0;
  return Array.from(byVaccine.entries())
    .map(([vaccineName, completed]) => ({
      vaccineName,
      completed,
      total,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }))
    .sort((a, b) => b.completed - a.completed);
}

// ============================================================================
// Health profile (per student)
// ============================================================================

export interface HealthProfile {
  student: {
    id: string;
    full_name: string;
    student_code: string;
    classroom: string | null;
    avatar_url: string | null;
    blood_type: string | null;
    emergency_contact_name: string | null;
    emergency_contact_relationship: string | null;
    emergency_contact_phone: string | null;
  } | null;
  latestRecord: {
    id: string;
    height_cm: number | null;
    weight_kg: number | null;
    bmi: number | null;
    nutrition_status: NutritionStatus | null;
    recorded_at: string;
  } | null;
  medicalConditions: { id: string; condition_type: string; name: string; severity: string }[];
  allergies: { id: string; allergy_type: string; allergen: string; severity: string; emergency_instructions: string | null }[];
}

export async function getHealthProfile(studentId: string): Promise<HealthProfile> {
  const supabase = await createClient();
  const [{ data: student }, { data: latestRecord }, { data: conditions }, { data: studentAllergies }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, student_code, classroom, avatar_url, blood_type, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("health_records")
      .select("id, height_cm, weight_kg, bmi, nutrition_status, recorded_at")
      .eq("student_id", studentId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("medical_conditions").select("id, condition_type, name, severity").eq("student_id", studentId).eq("is_active", true),
    supabase.from("allergies").select("id, allergy_type, allergen, severity, emergency_instructions").eq("student_id", studentId).eq("is_active", true),
  ]);

  return {
    student: student ?? null,
    latestRecord: latestRecord
      ? { ...latestRecord, nutrition_status: latestRecord.nutrition_status as NutritionStatus | null }
      : null,
    medicalConditions: conditions ?? [],
    allergies: studentAllergies ?? [],
  };
}

// ============================================================================
// Height & Weight Tracking / BMI
// ============================================================================

export async function recordMeasurement(params: {
  schoolId: string;
  studentId: string;
  heightCm: number;
  weightKg: number;
  recordedAt?: string;
  recordedBy?: string;
  remarks?: string;
}) {
  const supabase = await createClient();
  const { bmi, status } = calculateBmi(params.weightKg, params.heightCm);

  const { data, error } = await supabase
    .from("health_records")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      height_cm: params.heightCm,
      weight_kg: params.weightKg,
      bmi,
      nutrition_status: status,
      recorded_at: params.recordedAt ?? new Date().toISOString().slice(0, 10),
      recorded_by: params.recordedBy ?? null,
      remarks: params.remarks ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (status === "severely_underweight" || status === "obese") {
    await supabase.from("health_alerts").insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      alert_type: "bmi_risk",
      severity: status === "severely_underweight" ? "high" : "medium",
      message: `ผลค่า BMI อยู่ในเกณฑ์ ${nutritionStatusLabel[status]} (BMI ${bmi}) ควรติดตามและให้คำแนะนำด้านโภชนาการ`,
    });
  }

  return data;
}

export async function bulkImportMeasurements(
  schoolId: string,
  rows: { studentCode: string; heightCm: number; weightKg: number; recordedAt?: string }[],
  recordedBy?: string
): Promise<{ success: number; failed: { studentCode: string; reason: string }[] }> {
  const supabase = await createClient();
  let success = 0;
  const failed: { studentCode: string; reason: string }[] = [];

  for (const row of rows) {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("school_id", schoolId)
      .eq("student_code", row.studentCode)
      .maybeSingle();
    if (!student) {
      failed.push({ studentCode: row.studentCode, reason: "ไม่พบรหัสนักเรียน" });
      continue;
    }
    try {
      await recordMeasurement({
        schoolId,
        studentId: student.id,
        heightCm: row.heightCm,
        weightKg: row.weightKg,
        recordedAt: row.recordedAt,
        recordedBy,
      });
      success++;
    } catch (e) {
      failed.push({ studentCode: row.studentCode, reason: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" });
    }
  }

  return { success, failed };
}

export interface GrowthPoint {
  recorded_at: string;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
}

export async function getGrowthHistory(studentId: string, limit = 24): Promise<GrowthPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("health_records")
    .select("recorded_at, height_cm, weight_kg, bmi")
    .eq("student_id", studentId)
    .order("recorded_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

// ============================================================================
// Vaccination Management
// ============================================================================

export async function getVaccinationSchedules() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vaccination_schedules")
    .select("*")
    .order("recommended_age_months", { ascending: true });
  return data ?? [];
}

export async function recordVaccination(params: {
  schoolId: string;
  studentId: string;
  vaccineName: string;
  doseNumber?: number;
  administeredAt?: string;
  nextDueAt?: string;
  hospital?: string;
  notes?: string;
  recordedBy?: string;
  status?: "scheduled" | "completed" | "overdue" | "exempted";
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vaccinations")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      vaccine_name: params.vaccineName,
      dose_number: params.doseNumber ?? 1,
      administered_at: params.administeredAt ?? new Date().toISOString().slice(0, 10),
      next_due_at: params.nextDueAt ?? null,
      hospital: params.hospital ?? null,
      notes: params.notes ?? null,
      status: params.status ?? "completed",
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getStudentVaccinations(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("student_id", studentId)
    .order("administered_at", { ascending: false });
  return data ?? [];
}

export async function getUpcomingVaccinations(daysAhead = 30) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("vaccinations")
    .select("*, students(full_name, student_code, classroom)")
    .gte("next_due_at", today)
    .lte("next_due_at", cutoff)
    .order("next_due_at", { ascending: true });
  return data ?? [];
}

// ============================================================================
// Medical Conditions
// ============================================================================

export async function getStudentMedicalConditions(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medical_conditions")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addMedicalCondition(params: {
  schoolId: string;
  studentId: string;
  conditionType: "chronic" | "congenital" | "physical_disability" | "learning_disability" | "mental_health";
  name: string;
  severity?: "mild" | "moderate" | "severe";
  diagnosedDate?: string;
  notes?: string;
  careInstructions?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medical_conditions")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      condition_type: params.conditionType,
      name: params.name,
      severity: params.severity ?? "moderate",
      diagnosed_date: params.diagnosedDate ?? null,
      notes: params.notes ?? null,
      care_instructions: params.careInstructions ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.severity === "severe") {
    await supabase.from("health_alerts").insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      alert_type: "medical_condition_risk",
      severity: "high",
      message: `มีภาวะสุขภาพระดับรุนแรง: ${params.name} ควรมีแผนดูแลฉุกเฉินที่ชัดเจน`,
    });
  }

  return data;
}

// ============================================================================
// Allergy Management
// ============================================================================

export async function getStudentAllergies(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("allergies")
    .select("*")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .order("severity", { ascending: false });
  return data ?? [];
}

export async function addAllergy(params: {
  schoolId: string;
  studentId: string;
  allergyType: "food" | "drug" | "environmental";
  allergen: string;
  severity?: "mild" | "moderate" | "severe" | "life_threatening";
  reaction?: string;
  emergencyInstructions?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("allergies")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      allergy_type: params.allergyType,
      allergen: params.allergen,
      severity: params.severity ?? "mild",
      reaction: params.reaction ?? null,
      emergency_instructions: params.emergencyInstructions ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.severity === "severe" || params.severity === "life_threatening") {
    await supabase.from("health_alerts").insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      alert_type: "allergy_alert",
      severity: params.severity === "life_threatening" ? "critical" : "high",
      message: `แพ้ ${params.allergen} ระดับรุนแรง ควรแจ้งครูผู้สอนและฝ่ายอาหารกลางวันทุกครั้ง`,
    });
  }

  return data;
}

/** Quick lookup used by attendance/lunch modules to surface allergy badges. */
export async function getActiveAllergyMap(studentIds: string[]): Promise<Map<string, { allergen: string; severity: string }[]>> {
  if (studentIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("allergies")
    .select("student_id, allergen, severity")
    .in("student_id", studentIds)
    .eq("is_active", true);

  const map = new Map<string, { allergen: string; severity: string }[]>();
  for (const a of data ?? []) {
    const list = map.get(a.student_id) ?? [];
    list.push({ allergen: a.allergen, severity: a.severity });
    map.set(a.student_id, list);
  }
  return map;
}

// ============================================================================
// Health Screening System
// ============================================================================

export async function recordHealthScreening(params: {
  schoolId: string;
  studentId: string;
  screeningType: "vision" | "hearing" | "dental" | "physical" | "mental_health";
  result: "pass" | "monitor" | "refer";
  screeningDate?: string;
  findings?: string;
  recommendation?: string;
  nextScreeningDate?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("health_screenings")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      screening_type: params.screeningType,
      result: params.result,
      screening_date: params.screeningDate ?? new Date().toISOString().slice(0, 10),
      findings: params.findings ?? null,
      recommendation: params.recommendation ?? null,
      next_screening_date: params.nextScreeningDate ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.result === "refer") {
    await supabase.from("health_alerts").insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      alert_type: "screening_due",
      severity: "medium",
      message: `ผลตรวจคัดกรอง${screeningTypeLabel[params.screeningType]}อยู่ในเกณฑ์ต้องส่งต่อ ควรนัดพบแพทย์ผู้เชี่ยวชาญ`,
    });
  }

  return data;
}

export const screeningTypeLabel: Record<string, string> = {
  vision: "การมองเห็น",
  hearing: "การได้ยิน",
  dental: "ทันตกรรม",
  physical: "ร่างกาย",
  mental_health: "สุขภาพจิต",
};

export async function getStudentScreenings(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("health_screenings")
    .select("*")
    .eq("student_id", studentId)
    .order("screening_date", { ascending: false });
  return data ?? [];
}

// ============================================================================
// Dental Health Module
// ============================================================================

export async function recordDentalCheckup(params: {
  schoolId: string;
  studentId: string;
  checkupDate?: string;
  toothDecayCount?: number;
  oralHygieneStatus?: "good" | "fair" | "poor";
  treatmentNeeded?: string;
  notes?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dental_records")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      checkup_date: params.checkupDate ?? new Date().toISOString().slice(0, 10),
      tooth_decay_count: params.toothDecayCount ?? 0,
      oral_hygiene_status: params.oralHygieneStatus ?? "good",
      treatment_needed: params.treatmentNeeded ?? null,
      notes: params.notes ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDentalStatistics() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dental_records")
    .select("student_id, tooth_decay_count, treatment_needed, treatment_completed, checkup_date")
    .order("checkup_date", { ascending: false });

  const latestByStudent = new Map<string, { tooth_decay_count: number; treatment_needed: string | null; treatment_completed: boolean }>();
  for (const r of data ?? []) {
    if (!latestByStudent.has(r.student_id)) {
      latestByStudent.set(r.student_id, r);
    }
  }

  let healthyTeeth = 0;
  let dentalProblems = 0;
  let treatmentNeeded = 0;
  for (const r of latestByStudent.values()) {
    if (r.tooth_decay_count === 0) healthyTeeth++;
    else dentalProblems++;
    if (r.treatment_needed && !r.treatment_completed) treatmentNeeded++;
  }

  return { healthyTeeth, dentalProblems, treatmentNeeded, total: latestByStudent.size };
}

// ============================================================================
// Medication Management
// ============================================================================

export async function getStudentMedications(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medications")
    .select("*")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addMedication(params: {
  schoolId: string;
  studentId: string;
  medicationName: string;
  dosage?: string;
  schedule?: string;
  prescribingDoctor?: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
  specialCareNotes?: string;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medications")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      medication_name: params.medicationName,
      dosage: params.dosage ?? null,
      schedule: params.schedule ?? null,
      prescribing_doctor: params.prescribingDoctor ?? null,
      instructions: params.instructions ?? null,
      start_date: params.startDate ?? null,
      end_date: params.endDate ?? null,
      special_care_notes: params.specialCareNotes ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Health Alert System
// ============================================================================

export async function getActiveHealthAlerts(limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("health_alerts")
    .select("*, students(full_name, student_code, classroom)")
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function resolveHealthAlert(alertId: string, resolvedBy: string) {
  const supabase = await createClient();
  await supabase
    .from("health_alerts")
    .update({ is_resolved: true, resolved_by: resolvedBy, resolved_at: new Date().toISOString() })
    .eq("id", alertId);
}

/**
 * Scans for students with no health record at all, or vaccinations whose
 * next_due_at has already passed, and creates health_alerts for them.
 * Designed to be called from a dashboard load or a scheduled job.
 */
export async function generateMissingRecordAlerts(schoolId: string): Promise<number> {
  const supabase = await createClient();
  const [{ data: students }, { data: records }, { data: overdueVaccinations }] = await Promise.all([
    supabase.from("students").select("id, full_name").eq("school_id", schoolId).eq("is_active", true),
    supabase.from("health_records").select("student_id"),
    supabase
      .from("vaccinations")
      .select("id, student_id, vaccine_name, next_due_at, status")
      .eq("school_id", schoolId)
      .lt("next_due_at", new Date().toISOString().slice(0, 10))
      .neq("status", "completed"),
  ]);

  const studentsWithRecords = new Set((records ?? []).map((r) => r.student_id));
  let created = 0;

  for (const student of students ?? []) {
    if (studentsWithRecords.has(student.id)) continue;
    const { data: existing } = await supabase
      .from("health_alerts")
      .select("id")
      .eq("student_id", student.id)
      .eq("alert_type", "missing_record")
      .eq("is_resolved", false)
      .maybeSingle();
    if (existing) continue;
    await supabase.from("health_alerts").insert({
      school_id: schoolId,
      student_id: student.id,
      alert_type: "missing_record",
      severity: "low",
      message: `${student.full_name} ยังไม่มีบันทึกข้อมูลสุขภาพ (ส่วนสูง/น้ำหนัก)`,
    });
    created++;
  }

  for (const v of overdueVaccinations ?? []) {
    const { data: existing } = await supabase
      .from("health_alerts")
      .select("id")
      .eq("student_id", v.student_id)
      .eq("alert_type", "vaccination_due")
      .eq("is_resolved", false)
      .maybeSingle();
    if (existing) continue;
    await supabase.from("health_alerts").insert({
      school_id: schoolId,
      student_id: v.student_id,
      alert_type: "vaccination_due",
      severity: "medium",
      message: `วัคซีน ${v.vaccine_name} เกินกำหนดวันนัด ควรติดตามการฉีดวัคซีน`,
    });
    created++;
  }

  return created;
}

// ============================================================================
// Health Reports
// ============================================================================

export interface ClassHealthReportRow {
  classroom: string;
  studentCount: number;
  healthyCount: number;
  underweightCount: number;
  overweightCount: number;
  obeseCount: number;
  vaccinationRate: number;
}

export async function getClassHealthReport(): Promise<ClassHealthReportRow[]> {
  const supabase = await createClient();
  const [{ data: students }, { data: records }, { data: vaccinations }] = await Promise.all([
    supabase.from("students").select("id, classroom").eq("is_active", true),
    supabase.from("health_records").select("student_id, nutrition_status, recorded_at").order("recorded_at", { ascending: false }),
    supabase.from("vaccinations").select("student_id, status").eq("status", "completed"),
  ]);

  const latestByStudent = new Map<string, NutritionStatus | null>();
  for (const r of records ?? []) {
    if (!latestByStudent.has(r.student_id)) latestByStudent.set(r.student_id, r.nutrition_status as NutritionStatus | null);
  }
  const vaccinatedStudents = new Set((vaccinations ?? []).map((v) => v.student_id));

  const byClassroom = new Map<string, { studentIds: string[] }>();
  for (const s of students ?? []) {
    const classroom = s.classroom ?? "ไม่ระบุ";
    const cur = byClassroom.get(classroom) ?? { studentIds: [] };
    cur.studentIds.push(s.id);
    byClassroom.set(classroom, cur);
  }

  return Array.from(byClassroom.entries())
    .map(([classroom, { studentIds }]) => {
      let healthyCount = 0;
      let underweightCount = 0;
      let overweightCount = 0;
      let obeseCount = 0;
      let vaccinated = 0;
      for (const id of studentIds) {
        const status = latestByStudent.get(id);
        if (status === "normal") healthyCount++;
        else if (status === "underweight" || status === "severely_underweight") underweightCount++;
        else if (status === "overweight") overweightCount++;
        else if (status === "obese") obeseCount++;
        if (vaccinatedStudents.has(id)) vaccinated++;
      }
      return {
        classroom,
        studentCount: studentIds.length,
        healthyCount,
        underweightCount,
        overweightCount,
        obeseCount,
        vaccinationRate: studentIds.length > 0 ? Math.round((vaccinated / studentIds.length) * 100) : 0,
      };
    })
    .sort((a, b) => a.classroom.localeCompare(b.classroom));
}

export async function getIndividualHealthReport(studentId: string) {
  const [profile, growth, vaccinations, screenings, conditions, studentAllergies, medications] = await Promise.all([
    getHealthProfile(studentId),
    getGrowthHistory(studentId),
    getStudentVaccinations(studentId),
    getStudentScreenings(studentId),
    getStudentMedicalConditions(studentId),
    getStudentAllergies(studentId),
    getStudentMedications(studentId),
  ]);

  return { profile, growth, vaccinations, screenings, conditions, allergies: studentAllergies, medications };
}

// ============================================================================
// Parent Health Portal
// ============================================================================

export async function getParentHealthSummary(studentId: string) {
  const [profile, growth, vaccinations] = await Promise.all([
    getHealthProfile(studentId),
    getGrowthHistory(studentId),
    getStudentVaccinations(studentId),
  ]);
  return { profile, growth, vaccinations };
}

// ============================================================================
// Health Analytics
// ============================================================================

export async function getHealthAnalytics() {
  const [bmiDistribution, vaccinationCoverage, classroomComparison] = await Promise.all([
    getBmiDistribution(),
    getVaccinationCoverage(),
    getClassHealthReport(),
  ]);
  return { bmiDistribution, vaccinationCoverage, classroomComparison };
}

// ============================================================================
// AI Health Analysis (rule-based, no external LLM calls)
// ============================================================================

export async function getAiHealthAnalysis(studentId: string): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: student }, growth, { data: conditions }, { data: studentAllergies }, vaccinations] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", studentId).single(),
    getGrowthHistory(studentId),
    supabase.from("medical_conditions").select("name, severity").eq("student_id", studentId).eq("is_active", true),
    supabase.from("allergies").select("allergen, severity").eq("student_id", studentId).eq("is_active", true),
    getStudentVaccinations(studentId),
  ]);

  const insights: string[] = [];
  if (!student) {
    insights.push("ไม่พบข้อมูลนักเรียน");
    return insights;
  }

  if (growth.length === 0) {
    insights.push(`${student.full_name} ยังไม่มีบันทึกการเจริญเติบโต (ส่วนสูง/น้ำหนัก) ควรเริ่มบันทึกข้อมูลโดยเร็ว`);
    return insights;
  }

  const latest = growth[growth.length - 1];

  if (latest.bmi !== null) {
    const { status } = calculateBmi(latest.weight_kg ?? 0, latest.height_cm ?? 1);
    if (status === "severely_underweight") {
      insights.push(`${student.full_name} มีค่า BMI อยู่ในเกณฑ์ผอมมาก (${latest.bmi}) มีความเสี่ยงด้านภาวะทุพโภชนาการ ควรปรึกษาแพทย์และติดตามการรับประทานอาหาร`);
    } else if (status === "underweight") {
      insights.push(`${student.full_name} มีค่า BMI อยู่ในเกณฑ์ผอม (${latest.bmi}) ควรเสริมสารอาหารและติดตามการเจริญเติบโตอย่างใกล้ชิด`);
    } else if (status === "overweight") {
      insights.push(`${student.full_name} มีค่า BMI อยู่ในเกณฑ์น้ำหนักเกิน (${latest.bmi}) ควรส่งเสริมการออกกำลังกายและควบคุมอาหาร`);
    } else if (status === "obese") {
      insights.push(`${student.full_name} มีค่า BMI อยู่ในเกณฑ์อ้วน (${latest.bmi}) มีความเสี่ยงต่อโรคไม่ติดต่อเรื้อรัง ควรปรึกษาแพทย์และวางแผนด้านโภชนาการ`);
    } else {
      insights.push(`${student.full_name} มีค่า BMI อยู่ในเกณฑ์ปกติ (${latest.bmi}) แสดงถึงภาวะโภชนาการที่ดี`);
    }
  }

  if (growth.length >= 2) {
    const prev = growth[growth.length - 2];
    if (prev.height_cm && latest.height_cm && latest.height_cm <= prev.height_cm) {
      insights.push(`${student.full_name} ไม่มีการเพิ่มขึ้นของส่วนสูงเมื่อเทียบกับการวัดครั้งก่อน ควรเฝ้าระวังภาวะเจริญเติบโตช้า (Growth Delay)`);
    }
    if (prev.weight_kg && latest.weight_kg) {
      const change = latest.weight_kg - prev.weight_kg;
      if (Math.abs(change) >= 3) {
        insights.push(
          `${student.full_name} มีการเปลี่ยนแปลงน้ำหนักอย่างรวดเร็ว (${change > 0 ? "+" : ""}${change.toFixed(1)} กก.) ควรตรวจสอบสาเหตุและติดตามสุขภาพ`
        );
      }
    }
  }

  const severeConditions = (conditions ?? []).filter((c) => c.severity === "severe");
  if (severeConditions.length > 0) {
    insights.push(`${student.full_name} มีภาวะสุขภาพระดับรุนแรง (${severeConditions.map((c) => c.name).join(", ")}) ควรมีแผนดูแลฉุกเฉินพร้อมใช้งาน`);
  }

  const severeAllergies = (studentAllergies ?? []).filter((a) => a.severity === "severe" || a.severity === "life_threatening");
  if (severeAllergies.length > 0) {
    insights.push(`${student.full_name} แพ้ ${severeAllergies.map((a) => a.allergen).join(", ")} ระดับรุนแรง ควรแจ้งเตือนทุกครั้งที่มีการแจกอาหารหรือยา`);
  }

  const completedVaccines = new Set(vaccinations.filter((v) => v.status === "completed").map((v) => v.vaccine_name));
  const requiredVaccines = ["BCG", "HBV", "DTP", "MMR", "Polio"];
  const missing = requiredVaccines.filter((v) => !completedVaccines.has(v));
  if (missing.length > 0) {
    insights.push(`${student.full_name} ยังไม่ได้รับวัคซีน ${missing.join(", ")} ควรติดตามและนัดฉีดวัคซีนให้ครบถ้วน`);
  }

  if (insights.length === 0) {
    insights.push(`${student.full_name} มีสุขภาพโดยรวมอยู่ในเกณฑ์ปกติ ไม่พบความเสี่ยงที่ชัดเจนในช่วงนี้`);
  }

  return insights;
}
