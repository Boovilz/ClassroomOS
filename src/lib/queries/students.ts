import { createClient } from "@/lib/supabase/server";

// ============================================================================
// List
// ============================================================================

export interface StudentsListFilters {
  grade?: string;
  classroom?: string;
  gender?: string;
  status?: "active" | "archived";
  riskLevel?: string;
  sort?: "name" | "student_code" | "gpa" | "attendance";
  direction?: "asc" | "desc";
  /** Include soft-deleted (`deleted_at is not null`) rows. Used by a future
   *  "trash" view; defaults to false so every existing call site keeps
   *  filtering out soft-deleted students with no changes required. */
  includeDeleted?: boolean;
  /** Filter by academic year as Buddhist Era year (e.g. 2568). Derived from
   *  enrollment_date: gregorian year = yearFilter - 543. */
  yearFilter?: number;
}

export interface StudentListRow {
  id: string;
  school_id: string;
  student_code: string;
  citizen_id: string | null;
  full_name: string;
  nickname: string | null;
  gender: string | null;
  grade: string | null;
  classroom: string | null;
  avatar_url: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  is_archived: boolean;
  risk_level: "low" | "medium" | "high" | null;
  deleted_at: string | null;
  birth_date: string | null;
  attendanceRate: number | null;
  gpa: number | null;
}

/**
 * Distinct, non-empty grade/classroom values currently in use among
 * non-deleted students, sorted naturally for Thai grade labels (ป.1...ป.6,
 * ม.1...ม.6). Powers the grade/classroom filter dropdowns, since those
 * values are free text rather than a fixed enum.
 */
export async function getDistinctGradesAndClassrooms(): Promise<{ grades: string[]; classrooms: string[] }> {
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("grade, classroom").is("deleted_at", null);

  const grades = new Set<string>();
  const classrooms = new Set<string>();
  for (const row of data ?? []) {
    if (row.grade) grades.add(row.grade);
    if (row.classroom) classrooms.add(row.classroom);
  }

  return {
    grades: Array.from(grades).sort((a, b) => a.localeCompare(b, "th", { numeric: true })),
    classrooms: Array.from(classrooms).sort((a, b) => a.localeCompare(b, "th", { numeric: true })),
  };
}

/**
 * Reads the base student rows plus filters, then derives attendance rate and
 * GPA per-student from `attendance`/`scores`. Mirrors getTopStudents in
 * dashboard.ts: a follow-up query keyed by the filtered student ids rather
 * than a single complex join, since RLS already scopes both tables.
 */
export async function getStudentsList(filters: StudentsListFilters = {}): Promise<StudentListRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("students")
    .select(
      "id, school_id, student_code, citizen_id, full_name, nickname, gender, grade, classroom, avatar_url, profile_picture_url, is_active, is_archived, risk_level, deleted_at, birth_date"
    );

  if (!filters.includeDeleted) query = query.is("deleted_at", null);
  if (filters.grade) query = query.eq("grade", filters.grade);
  if (filters.classroom) query = query.eq("classroom", filters.classroom);
  if (filters.gender) query = query.eq("gender", filters.gender as "male" | "female" | "other");
  if (filters.riskLevel) query = query.eq("risk_level", filters.riskLevel as "low" | "medium" | "high");
  if (filters.status === "archived") query = query.eq("is_archived", true);
  else if (filters.status === "active") query = query.eq("is_archived", false);
  if (filters.yearFilter) {
    const gregorianYear = filters.yearFilter - 543;
    query = query
      .gte("enrollment_date", `${gregorianYear}-01-01`)
      .lt("enrollment_date", `${gregorianYear + 1}-01-01`);
  }

  const { data: students } = await query.order("student_code");
  const rows = students ?? [];
  if (rows.length === 0) return [];

  const studentIds = rows.map((s) => s.id);

  const [{ data: attendanceRows }, { data: scoreRows }] = await Promise.all([
    supabase.from("attendance").select("student_id, status").in("student_id", studentIds),
    supabase.from("scores").select("student_id, score, max_score").in("student_id", studentIds),
  ]);

  const attendanceByStudent = new Map<string, { present: number; total: number }>();
  for (const row of attendanceRows ?? []) {
    const agg = attendanceByStudent.get(row.student_id) ?? { present: 0, total: 0 };
    agg.total += 1;
    if (row.status === "present" || row.status === "late") agg.present += 1;
    attendanceByStudent.set(row.student_id, agg);
  }

  const scoresByStudent = new Map<string, { total: number; count: number }>();
  for (const row of scoreRows ?? []) {
    const agg = scoresByStudent.get(row.student_id) ?? { total: 0, count: 0 };
    const normalized = row.max_score > 0 ? (row.score / row.max_score) * 100 : row.score;
    agg.total += normalized;
    agg.count += 1;
    scoresByStudent.set(row.student_id, agg);
  }

  let result: StudentListRow[] = rows.map((s) => {
    const attendance = attendanceByStudent.get(s.id);
    const scores = scoresByStudent.get(s.id);
    return {
      ...s,
      attendanceRate: attendance && attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : null,
      gpa: scores && scores.count > 0 ? Math.round((scores.total / scores.count) * 10) / 10 : null,
    };
  });

  const direction = filters.direction === "desc" ? -1 : 1;
  switch (filters.sort) {
    case "name":
      result = result.sort((a, b) => direction * a.full_name.localeCompare(b.full_name, "th"));
      break;
    case "gpa":
      result = result.sort((a, b) => direction * ((a.gpa ?? -1) - (b.gpa ?? -1)));
      break;
    case "attendance":
      result = result.sort((a, b) => direction * ((a.attendanceRate ?? -1) - (b.attendanceRate ?? -1)));
      break;
    case "student_code":
    default:
      result = result.sort((a, b) => direction * a.student_code.localeCompare(b.student_code));
      break;
  }

  return result;
}

// ============================================================================
// Detail
// ============================================================================

export async function getStudentDetail(id: string) {
  const supabase = await createClient();

  const [{ data: student }, { data: parents }, { data: healthRecords }, { data: avatar }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("parents").select("*").eq("student_id", id),
    supabase.from("health_records").select("*").eq("student_id", id).order("recorded_at", { ascending: false }),
    supabase.from("student_avatars").select("*").eq("student_id", id).maybeSingle(),
  ]);

  return {
    student,
    parents: parents ?? [],
    healthRecords: healthRecords ?? [],
    avatar,
  };
}

// ============================================================================
// AI summary (rule-based, no external calls)
// ============================================================================

export interface StudentAiSummary {
  academicSummary: string;
  attendanceSummary: string;
  behaviorSummary: string;
  healthSummary: string;
  parentCommunicationSuggestion: string;
  recommendedIntervention: string;
}

function bmiCategoryLocal(heightCm: number, weightKg: number): "underweight" | "healthy" | "overweight" | "obesity" {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "overweight";
  return "obesity";
}

const bmiLabel: Record<string, string> = {
  underweight: "น้ำหนักต่ำกว่าเกณฑ์",
  healthy: "สมส่วน",
  overweight: "น้ำหนักเกินเกณฑ์",
  obesity: "ภาวะอ้วน",
};

export async function getStudentAiSummary(id: string): Promise<StudentAiSummary> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: scores }, { data: attendance }, { data: behavior }, { data: health }] = await Promise.all([
    supabase
      .from("scores")
      .select("score, max_score, subjects(name)")
      .eq("student_id", id)
      .returns<{ score: number; max_score: number; subjects: { name: string } | null }[]>(),
    supabase.from("attendance").select("status, date").eq("student_id", id).gte("date", since),
    supabase.from("behavior_records").select("category, points").eq("student_id", id),
    supabase
      .from("health_records")
      .select("height_cm, weight_kg, allergies, chronic_conditions")
      .eq("student_id", id)
      .order("recorded_at", { ascending: false })
      .limit(1),
  ]);

  // Academic
  const bySubject = new Map<string, { total: number; count: number }>();
  for (const row of scores ?? []) {
    const name = row.subjects?.name ?? "ไม่ระบุวิชา";
    const normalized = row.max_score > 0 ? (row.score / row.max_score) * 100 : row.score;
    const agg = bySubject.get(name) ?? { total: 0, count: 0 };
    agg.total += normalized;
    agg.count += 1;
    bySubject.set(name, agg);
  }
  const subjectAverages = Array.from(bySubject.entries()).map(([subject, agg]) => ({
    subject,
    average: agg.count > 0 ? agg.total / agg.count : 0,
  }));
  const strengths = subjectAverages.filter((s) => s.average >= 75).map((s) => s.subject);
  const weaknesses = subjectAverages.filter((s) => s.average < 50).map((s) => s.subject);
  const academicSummary =
    subjectAverages.length === 0
      ? "ยังไม่มีข้อมูลผลการเรียนเพียงพอสำหรับการวิเคราะห์"
      : `จุดแข็ง: ${strengths.length > 0 ? strengths.join(", ") : "ยังไม่พบวิชาที่โดดเด่นเป็นพิเศษ"}. จุดที่ควรพัฒนา: ${
          weaknesses.length > 0 ? weaknesses.join(", ") : "ไม่มีวิชาที่น่าเป็นห่วง"
        }.`;

  // Attendance
  const attendanceRows = attendance ?? [];
  const absences = attendanceRows.filter((a) => a.status === "absent").length;
  const totalDays = attendanceRows.length;
  const absenceRate = totalDays > 0 ? Math.round((absences / totalDays) * 100) : 0;
  const attendanceSummary =
    totalDays === 0
      ? "ยังไม่มีข้อมูลการเข้าเรียนในช่วง 30 วันที่ผ่านมา"
      : absenceRate >= 20
      ? `ขาดเรียนคิดเป็น ${absenceRate}% ของวันเรียนใน 30 วันล่าสุด ถือว่ามีความเสี่ยงสูง`
      : absenceRate >= 10
      ? `ขาดเรียนคิดเป็น ${absenceRate}% ของวันเรียนใน 30 วันล่าสุด ควรเฝ้าติดตาม`
      : `อัตราการขาดเรียนอยู่ในเกณฑ์ปกติ (${absenceRate}%)`;

  // Behavior
  const negativePoints = (behavior ?? [])
    .filter((b) => b.category === "negative")
    .reduce((sum, b) => sum + Math.abs(b.points), 0);
  const positivePoints = (behavior ?? [])
    .filter((b) => b.category === "positive")
    .reduce((sum, b) => sum + b.points, 0);
  const behaviorSummary =
    negativePoints === 0 && positivePoints === 0
      ? "ยังไม่มีบันทึกพฤติกรรม"
      : negativePoints >= 20
      ? `มีคะแนนพฤติกรรมเชิงลบสะสมสูง (${negativePoints} คะแนน) ควรให้ความสำคัญเป็นพิเศษ`
      : negativePoints >= 10
      ? `มีคะแนนพฤติกรรมเชิงลบสะสมระดับปานกลาง (${negativePoints} คะแนน)`
      : `พฤติกรรมโดยรวมอยู่ในเกณฑ์ดี (คะแนนบวกสะสม ${positivePoints})`;

  // Health
  const latestHealth = health?.[0];
  let healthSummary = "ยังไม่มีบันทึกสุขภาพ";
  if (latestHealth?.height_cm && latestHealth?.weight_kg) {
    const category = bmiCategoryLocal(Number(latestHealth.height_cm), Number(latestHealth.weight_kg));
    healthSummary = `ภาวะโภชนาการ: ${bmiLabel[category]}`;
    if (latestHealth.allergies) healthSummary += ` · มีประวัติแพ้: ${latestHealth.allergies}`;
    if (latestHealth.chronic_conditions) healthSummary += ` · โรคประจำตัว: ${latestHealth.chronic_conditions}`;
  } else if (latestHealth?.allergies || latestHealth?.chronic_conditions) {
    healthSummary = `มีประวัติแพ้/โรคประจำตัวที่ควรเฝ้าระวัง: ${
      [latestHealth.allergies, latestHealth.chronic_conditions].filter(Boolean).join(", ")
    }`;
  }

  // Parent communication + intervention
  const riskSignals = [absenceRate >= 15, negativePoints >= 10, weaknesses.length > 0].filter(Boolean).length;
  const parentCommunicationSuggestion =
    riskSignals >= 2
      ? "ควรนัดพูดคุยกับผู้ปกครองโดยเร็วเพื่อหารือแนวทางช่วยเหลือร่วมกัน"
      : riskSignals === 1
      ? "ควรแจ้งผู้ปกครองเพื่อรับทราบสถานการณ์และติดตามอย่างต่อเนื่อง"
      : "ยังไม่จำเป็นต้องนัดพูดคุยเป็นพิเศษ สามารถสื่อสารตามรอบปกติ";

  const recommendedIntervention =
    riskSignals >= 2
      ? "พิจารณาเยี่ยมบ้าน วางแผนสอนเสริม และติดตามการเข้าเรียนอย่างใกล้ชิด"
      : riskSignals === 1
      ? "ติดตามสถานการณ์อย่างต่อเนื่อง และให้คำแนะนำเพิ่มเติมตามจุดที่พบ"
      : "ดำเนินการตามปกติ ไม่มีความเสี่ยงที่ต้องดำเนินการเร่งด่วน";

  return {
    academicSummary,
    attendanceSummary,
    behaviorSummary,
    healthSummary,
    parentCommunicationSuggestion,
    recommendedIntervention,
  };
}
