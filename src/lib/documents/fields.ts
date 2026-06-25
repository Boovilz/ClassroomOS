import { createClient } from "@/lib/supabase/server";
import { getStudentAttendanceAnalytics } from "@/lib/queries/attendance";
import { getStudentAiSummary } from "@/lib/queries/students";
import { getSavingsAccountByStudent } from "@/lib/queries/finance";

function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Builds the flat dot-key data object consumed by renderTemplate() for a
 * single student. Covers the placeholder groups in scope for the first
 * milestone (school/student/attendance/academic/behavior/health/finance/ai);
 * home_visit/sdq groups are deferred along with batch generation.
 */
export async function resolveStudentFields(schoolId: string, studentId: string): Promise<Record<string, string>> {
  const supabase = await createClient();

  const [{ data: school }, { data: student }, { data: scores }, { data: behavior }, { data: health }, attendance, savings, ai] =
    await Promise.all([
      supabase.from("schools").select("*").eq("id", schoolId).maybeSingle(),
      supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
      supabase
        .from("scores")
        .select("score, max_score, subjects(name)")
        .eq("student_id", studentId)
        .returns<{ score: number; max_score: number; subjects: { name: string } | null }[]>(),
      supabase.from("behavior_records").select("category, points").eq("student_id", studentId),
      supabase
        .from("health_records")
        .select("height_cm, weight_kg, allergies, chronic_conditions, recorded_at")
        .eq("student_id", studentId)
        .order("recorded_at", { ascending: false })
        .limit(1),
      getStudentAttendanceAnalytics(studentId),
      getSavingsAccountByStudent(studentId),
      getStudentAiSummary(studentId),
    ]);

  const avgScore =
    scores && scores.length > 0
      ? Math.round((scores.reduce((sum, s) => sum + (s.max_score > 0 ? (s.score / s.max_score) * 100 : 0), 0) / scores.length) * 10) / 10
      : 0;

  const behaviorPoints = (behavior ?? []).reduce((sum, b) => sum + (b.points ?? 0), 0);
  const latestHealth = health?.[0];

  const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  return {
    "today.date": today,

    "school.name": school?.name ?? "",
    "school.name_en": school?.name_en ?? "",
    "school.address": school?.address ?? "",
    "school.province": school?.province ?? "",
    "school.phone": school?.phone ?? "",
    "school.logo": school?.logo_url ?? "",

    "student.full_name": student?.full_name ?? "",
    "student.full_name_en": student?.full_name_en ?? "",
    "student.nickname": student?.nickname ?? "",
    "student.code": student?.student_code ?? "",
    "student.grade": student?.grade ?? "",
    "student.classroom": student?.classroom ?? "",
    "student.gender": student?.gender ?? "",
    "student.birth_date": fmtDate(student?.birth_date),
    "student.address": student?.address ?? "",
    "student.avatar": student?.avatar_url ?? "",
    "student.level": String(student?.level ?? ""),
    "student.xp": String(student?.xp ?? ""),
    "student.coins": String(student?.coins ?? ""),

    "attendance.rate": `${attendance.attendanceRate}`,
    "attendance.total_days": String(attendance.totalDays),
    "attendance.present_count": String(attendance.statusCounts.present),
    "attendance.absent_count": String(attendance.statusCounts.absent),
    "attendance.late_count": String(attendance.statusCounts.late),
    "attendance.current_absent_streak": String(attendance.currentAbsentStreak),

    "academic.average_score": String(avgScore),
    "academic.summary": ai.academicSummary,

    "behavior.points": String(behaviorPoints),
    "behavior.summary": ai.behaviorSummary,

    "health.height_cm": latestHealth?.height_cm != null ? String(latestHealth.height_cm) : "",
    "health.weight_kg": latestHealth?.weight_kg != null ? String(latestHealth.weight_kg) : "",
    "health.allergies": latestHealth?.allergies ?? "",
    "health.chronic_conditions": latestHealth?.chronic_conditions ?? "",
    "health.summary": ai.healthSummary,

    "finance.savings_balance": savings?.balance != null ? String(savings.balance) : "0",

    "ai.recommended_intervention": ai.recommendedIntervention,
    "ai.parent_communication_suggestion": ai.parentCommunicationSuggestion,
  };
}
