import { createClient } from "@/lib/supabase/server";
import { getAiRiskScore, type RiskScoreResult } from "@/lib/queries/welfare";
import {
  type SdqSubscale,
  type SdqAssessmentType,
  type SdqAssessmentPeriod,
  type SdqAssessmentStatus,
  type SdqRiskLevel,
  SDQ_DISCLAIMER,
  sdqAssessmentTypeLabel,
  sdqAssessmentPeriodLabel,
  sdqAssessmentStatusLabel,
  sdqRiskLevelLabel,
  sdqRiskLevelColor,
  sdqSubscaleLabel,
  classifySdqRisk,
} from "@/lib/queries/sdq-constants";

// Re-export so existing server-side imports of these from "@/lib/queries/sdq"
// keep working unchanged (same pattern as welfare.ts re-exporting from
// welfare-constants.ts).
export type { SdqSubscale, SdqAssessmentType, SdqAssessmentPeriod, SdqAssessmentStatus, SdqRiskLevel };
export {
  SDQ_DISCLAIMER,
  sdqAssessmentTypeLabel,
  sdqAssessmentPeriodLabel,
  sdqAssessmentStatusLabel,
  sdqRiskLevelLabel,
  sdqRiskLevelColor,
  sdqSubscaleLabel,
  classifySdqRisk,
};

async function getCurrentSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  return profile?.school_id ?? null;
}

// ============================================================================
// Scoring: standard SDQ scoring key (simplified 25-item bank, see
// sdq_questions seed in migration 0019 for the documented reverse-scored
// subset). Total Difficulties = emotional + conduct + hyperactivity +
// peer_problems (prosocial is a strengths scale, reported separately and
// NOT included in the total). classifySdqRisk() lives in sdq-constants.ts
// so client components can import it without pulling in next/headers.
// ============================================================================

export interface SdqQuestionRow {
  id: string;
  item_no: number;
  subscale: SdqSubscale;
  question_text_th: string;
  is_reverse_scored: boolean;
  display_order: number;
}

export async function getSdqQuestions(): Promise<SdqQuestionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("sdq_questions").select("*").order("display_order", { ascending: true }).returns<SdqQuestionRow[]>();
  return data ?? [];
}

export interface SdqScoreBreakdown {
  emotionalScore: number;
  conductScore: number;
  hyperactivityScore: number;
  peerProblemsScore: number;
  prosocialScore: number;
  totalDifficultiesScore: number;
  riskLevel: SdqRiskLevel;
}

/** Applies the reverse-scoring key and sums each subscale (0-10 per subscale). */
export function scoreSdqResponses(questions: SdqQuestionRow[], answers: Map<string, number>): SdqScoreBreakdown {
  const totals: Record<SdqSubscale, number> = { emotional: 0, conduct: 0, hyperactivity: 0, peer_problems: 0, prosocial: 0 };

  for (const q of questions) {
    const raw = answers.get(q.id);
    if (raw === undefined) continue;
    const value = q.is_reverse_scored ? 2 - raw : raw;
    totals[q.subscale] += value;
  }

  const totalDifficultiesScore = totals.emotional + totals.conduct + totals.hyperactivity + totals.peer_problems;

  return {
    emotionalScore: totals.emotional,
    conductScore: totals.conduct,
    hyperactivityScore: totals.hyperactivity,
    peerProblemsScore: totals.peer_problems,
    prosocialScore: totals.prosocial,
    totalDifficultiesScore,
    riskLevel: classifySdqRisk(totalDifficultiesScore),
  };
}

// ============================================================================
// Assessment workflow: create (assign) -> rater submits responses ->
// auto-score on submit -> visible in dashboard.
// ============================================================================

export async function createSdqAssessment(params: {
  schoolId: string;
  studentId: string;
  assessmentType: SdqAssessmentType;
  assessmentPeriod?: SdqAssessmentPeriod;
  assignedToUserId?: string; // teacher/admin rater (assessmentType = 'teacher')
  assignedToParentId?: string; // parent rater (assessmentType = 'parent')
  createdBy?: string;
}) {
  const supabase = await createClient();

  // For parent assessments, auto-resolve the student's primary contact
  // parent row when no explicit assignedToParentId is given.
  let resolvedParentId = params.assignedToParentId ?? null;
  if (params.assessmentType === "parent" && !resolvedParentId) {
    const { data: primaryParent } = await supabase
      .from("parents")
      .select("id")
      .eq("student_id", params.studentId)
      .eq("is_primary_contact", true)
      .maybeSingle();
    resolvedParentId = primaryParent?.id ?? null;
  }

  const { data, error } = await supabase
    .from("sdq_assessments")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      assessment_type: params.assessmentType,
      assessment_period: params.assessmentPeriod ?? "custom",
      assigned_to_user_id: params.assessmentType !== "parent" ? params.assignedToUserId ?? null : null,
      assigned_to_parent_id: params.assessmentType === "parent" ? resolvedParentId : null,
      status: "pending",
      assessment_date: new Date().toISOString().slice(0, 10),
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // "Assessment Due" notification, reusing Module 1/3's notifications table.
  const notifyUserId =
    params.assessmentType === "parent"
      ? (await supabase.from("parents").select("user_id").eq("id", resolvedParentId ?? "").maybeSingle()).data?.user_id
      : params.assessmentType === "student"
        ? (await supabase.from("students").select("user_id").eq("id", params.studentId).maybeSingle()).data?.user_id
        : params.assignedToUserId;

  if (notifyUserId) {
    await supabase.from("notifications").insert({
      school_id: params.schoolId,
      user_id: notifyUserId,
      title: "มีแบบประเมิน SDQ ที่ต้องทำ",
      body: `คุณได้รับมอบหมายให้ทำแบบประเมิน SDQ (${sdqAssessmentTypeLabel[params.assessmentType]})`,
      link: `/sdq/${data.id}`,
      category: "sdq",
      priority: "medium",
    });
  }

  return data;
}

export interface SdqAssessmentDetail {
  id: string;
  school_id: string;
  student_id: string;
  assessed_by: string | null;
  assessment_date: string;
  assessment_type: SdqAssessmentType;
  assessment_period: SdqAssessmentPeriod;
  status: SdqAssessmentStatus;
  emotional_score: number | null;
  conduct_score: number | null;
  hyperactivity_score: number | null;
  peer_problems_score: number | null;
  prosocial_score: number | null;
  total_difficulties_score: number | null;
  risk_level: SdqRiskLevel | null;
  assigned_to_user_id: string | null;
  assigned_to_parent_id: string | null;
  submitted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  students: { full_name: string; student_code: string; classroom: string | null; grade: string | null } | null;
}

export async function getSdqAssessment(assessmentId: string): Promise<SdqAssessmentDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sdq_assessments")
    .select("*, students(full_name, student_code, classroom, grade)")
    .eq("id", assessmentId)
    .maybeSingle()
    .returns<SdqAssessmentDetail | null>();
  return data ?? null;
}

export async function getSdqAssessmentWithResponses(assessmentId: string) {
  const supabase = await createClient();
  const [assessment, questions, { data: responses }] = await Promise.all([
    getSdqAssessment(assessmentId),
    getSdqQuestions(),
    supabase.from("sdq_responses").select("question_id, answer_value").eq("assessment_id", assessmentId),
  ]);
  const answerMap = new Map((responses ?? []).map((r) => [r.question_id, r.answer_value]));
  return { assessment, questions, answers: answerMap };
}

/** Saves one item's answer (upsert) - called as the rater progresses through the 25 items. */
export async function saveSdqResponse(params: { schoolId: string; assessmentId: string; questionId: string; answerValue: 0 | 1 | 2 }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sdq_responses")
    .upsert(
      { school_id: params.schoolId, assessment_id: params.assessmentId, question_id: params.questionId, answer_value: params.answerValue },
      { onConflict: "assessment_id,question_id" }
    );
  if (error) throw error;

  await supabase.from("sdq_assessments").update({ status: "in_progress" }).eq("id", params.assessmentId).eq("status", "pending");
}

/**
 * Submits the assessment: scores all 25 responses, writes the sdq_scores
 * result row, marks the assessment completed, and triggers a high-risk
 * notification when applicable.
 */
export async function submitSdqAssessment(assessmentId: string) {
  const supabase = await createClient();
  const { assessment, questions, answers } = await getSdqAssessmentWithResponses(assessmentId);
  if (!assessment) throw new Error("ไม่พบแบบประเมิน");
  if (answers.size < questions.length) {
    throw new Error(`กรุณาตอบให้ครบทุกข้อ (ตอบแล้ว ${answers.size}/${questions.length})`);
  }

  const breakdown = scoreSdqResponses(questions, answers);

  const { error: scoreError } = await supabase.from("sdq_scores").upsert(
    {
      school_id: assessment.school_id,
      assessment_id: assessmentId,
      student_id: assessment.student_id,
      emotional_score: breakdown.emotionalScore,
      conduct_score: breakdown.conductScore,
      hyperactivity_score: breakdown.hyperactivityScore,
      peer_problems_score: breakdown.peerProblemsScore,
      prosocial_score: breakdown.prosocialScore,
      total_difficulties_score: breakdown.totalDifficultiesScore,
      risk_level: breakdown.riskLevel,
    },
    { onConflict: "assessment_id" }
  );
  if (scoreError) throw scoreError;

  const { error: updateError } = await supabase
    .from("sdq_assessments")
    .update({
      status: "completed",
      submitted_at: new Date().toISOString(),
      emotional_score: breakdown.emotionalScore,
      conduct_score: breakdown.conductScore,
      hyperactivity_score: breakdown.hyperactivityScore,
      peer_problems_score: breakdown.peerProblemsScore,
      prosocial_score: breakdown.prosocialScore,
      total_difficulties_score: breakdown.totalDifficultiesScore,
      risk_level: breakdown.riskLevel,
    })
    .eq("id", assessmentId);
  if (updateError) throw updateError;

  // Early-warning notification for high-risk results, reusing the generic
  // notifications table (no parallel early_warning_alerts table).
  if (breakdown.riskLevel === "high_risk" || breakdown.riskLevel === "critical") {
    const { data: teacherUsers } = await supabase
      .from("students")
      .select("teacher_id, teachers(user_id)")
      .eq("id", assessment.student_id)
      .maybeSingle()
      .returns<{ teacher_id: string | null; teachers: { user_id: string | null } | null } | null>();
    const teacherUserId = teacherUsers?.teachers?.user_id;
    if (teacherUserId) {
      await supabase.from("notifications").insert({
        school_id: assessment.school_id,
        user_id: teacherUserId,
        title: "นักเรียนกลุ่มเสี่ยงสูงจากผลประเมิน SDQ",
        body: `ผลประเมิน SDQ ของนักเรียนอยู่ในระดับ "${sdqRiskLevelLabel[breakdown.riskLevel]}" ควรพิจารณาติดตามดูแลเพิ่มเติม`,
        link: `/sdq/${assessmentId}`,
        category: "sdq",
        priority: "high",
      });
    }
  }

  return breakdown;
}

// ============================================================================
// Follow-up: wires into Module 9's case/intervention system rather than a
// new follow-up table - student_cases/intervention_plans already have an
// sdq_assessment_id link (migration 0019) for exactly this purpose.
// ============================================================================

export async function scheduleSdqFollowUp(params: {
  schoolId: string;
  assessmentId: string;
  studentId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  openedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_cases")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      title: params.title,
      concern_type: "behavior",
      description: params.description ?? null,
      opened_by: params.openedBy ?? null,
      assigned_to: params.assignedTo ?? null,
      sdq_assessment_id: params.assessmentId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Listing / Dashboard
// ============================================================================

export interface SdqAssessmentListRow {
  id: string;
  assessment_date: string;
  assessment_type: SdqAssessmentType;
  assessment_period: SdqAssessmentPeriod;
  status: SdqAssessmentStatus;
  total_difficulties_score: number | null;
  risk_level: SdqRiskLevel | null;
  students: { id: string; full_name: string; student_code: string; classroom: string | null } | null;
}

export async function getSdqAssessments(filters?: { studentId?: string; status?: SdqAssessmentStatus; limit?: number }): Promise<SdqAssessmentListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("sdq_assessments")
    .select(
      "id, assessment_date, assessment_type, assessment_period, status, total_difficulties_score, risk_level, students(id, full_name, student_code, classroom)"
    )
    .order("assessment_date", { ascending: false });

  if (filters?.studentId) query = query.eq("student_id", filters.studentId);
  if (filters?.status) query = query.eq("status", filters.status);
  query = query.limit(filters?.limit ?? 50);

  const { data } = await query.returns<SdqAssessmentListRow[]>();
  return data ?? [];
}

export interface SdqDashboardStats {
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  completionRate: number;
  riskDistribution: { level: SdqRiskLevel; label: string; count: number }[];
}

export async function getSdqDashboard(schoolId: string): Promise<SdqDashboardStats> {
  const supabase = await createClient();
  const [{ count: total }, { count: completed }, { count: pending }, { data: scores }] = await Promise.all([
    supabase.from("sdq_assessments").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("sdq_assessments").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "completed"),
    supabase.from("sdq_assessments").select("id", { count: "exact", head: true }).eq("school_id", schoolId).in("status", ["pending", "in_progress"]),
    supabase.from("sdq_scores").select("risk_level").eq("school_id", schoolId),
  ]);

  const counts: Record<SdqRiskLevel, number> = { normal: 0, borderline: 0, at_risk: 0, high_risk: 0, critical: 0 };
  for (const row of scores ?? []) {
    const key = row.risk_level as SdqRiskLevel;
    if (counts[key] !== undefined) counts[key]++;
  }

  return {
    totalAssessments: total ?? 0,
    completedAssessments: completed ?? 0,
    pendingAssessments: pending ?? 0,
    completionRate: total ? Math.round(((completed ?? 0) / total) * 100) : 0,
    riskDistribution: (Object.keys(counts) as SdqRiskLevel[]).map((level) => ({ level, label: sdqRiskLevelLabel[level], count: counts[level] })),
  };
}

export interface SdqClassroomComparisonRow {
  classroom: string;
  studentCount: number;
  averageTotalDifficulties: number;
  riskCount: number;
}

export async function getSdqClassroomComparison(schoolId: string): Promise<SdqClassroomComparisonRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sdq_scores")
    .select("total_difficulties_score, risk_level, students(classroom)")
    .eq("school_id", schoolId)
    .returns<{ total_difficulties_score: number; risk_level: SdqRiskLevel; students: { classroom: string | null } | null }[]>();

  const byClassroom = new Map<string, { total: number; count: number; riskCount: number }>();
  for (const row of data ?? []) {
    const classroom = row.students?.classroom ?? "ไม่ระบุ";
    const entry = byClassroom.get(classroom) ?? { total: 0, count: 0, riskCount: 0 };
    entry.total += row.total_difficulties_score;
    entry.count++;
    if (row.risk_level === "at_risk" || row.risk_level === "high_risk" || row.risk_level === "critical") entry.riskCount++;
    byClassroom.set(classroom, entry);
  }

  return Array.from(byClassroom.entries())
    .map(([classroom, v]) => ({
      classroom,
      studentCount: v.count,
      averageTotalDifficulties: v.count > 0 ? Math.round((v.total / v.count) * 10) / 10 : 0,
      riskCount: v.riskCount,
    }))
    .sort((a, b) => a.classroom.localeCompare(b.classroom));
}

// ============================================================================
// AI SDQ Analysis (rule-based, no external LLM call - same style as
// getAiHomeVisitAnalysis / getAi*Analysis elsewhere in the codebase).
// ============================================================================

export async function getAiSdqAnalysis(assessmentId: string): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: assessment }, { data: score }] = await Promise.all([
    supabase
      .from("sdq_assessments")
      .select("*, students(full_name)")
      .eq("id", assessmentId)
      .maybeSingle()
      .returns<{ students: { full_name: string } | null } | null>(),
    supabase.from("sdq_scores").select("*").eq("assessment_id", assessmentId).maybeSingle(),
  ]);

  const insights: string[] = [];
  if (!assessment || !score) {
    insights.push("ยังไม่มีผลการประเมิน SDQ ที่เสร็จสมบูรณ์สำหรับนักเรียนนี้");
    return insights;
  }

  const studentName = assessment.students?.full_name ?? "นักเรียน";
  const riskLevel = score.risk_level as SdqRiskLevel;

  insights.push(`คะแนนความยากลำบากโดยรวม (Total Difficulties) ของ${studentName} คือ ${score.total_difficulties_score}/40 อยู่ในระดับ "${sdqRiskLevelLabel[riskLevel]}"`);

  if (score.emotional_score >= 7) {
    insights.push(`คะแนนด้านอารมณ์สูง (${score.emotional_score}/10) ควรสังเกตอาการวิตกกังวลหรือความเครียดเพิ่มเติม`);
  }
  if (score.conduct_score >= 7) {
    insights.push(`คะแนนด้านความประพฤติสูง (${score.conduct_score}/10) ควรให้คำปรึกษาด้านพฤติกรรมและการควบคุมอารมณ์`);
  }
  if (score.hyperactivity_score >= 7) {
    insights.push(`คะแนนด้านการอยู่ไม่นิ่ง/สมาธิสั้นสูง (${score.hyperactivity_score}/10) ควรปรับสิ่งแวดล้อมการเรียนและพิจารณาส่งต่อผู้เชี่ยวชาญหากจำเป็น`);
  }
  if (score.peer_problems_score >= 7) {
    insights.push(`คะแนนด้านปัญหาความสัมพันธ์กับเพื่อนสูง (${score.peer_problems_score}/10) ควรส่งเสริมกิจกรรมกลุ่มและทักษะทางสังคม`);
  }
  if (score.prosocial_score <= 4) {
    insights.push(`คะแนนด้านสัมพันธภาพทางสังคม/จุดแข็งค่อนข้างต่ำ (${score.prosocial_score}/10) ควรส่งเสริมกิจกรรมที่ฝึกความเอื้อเฟื้อและการช่วยเหลือผู้อื่น`);
  } else if (score.prosocial_score >= 8) {
    insights.push(`คะแนนด้านสัมพันธภาพทางสังคมอยู่ในระดับดีมาก (${score.prosocial_score}/10) เป็นจุดแข็งที่ควรส่งเสริมต่อไป`);
  }

  if (riskLevel === "high_risk" || riskLevel === "critical") {
    insights.push(`ควรนัดพบผู้ปกครองและพิจารณาเปิดเคสติดตาม (Case Management) พร้อมแผนช่วยเหลือ (Intervention Plan) โดยเร็ว`);
  } else if (riskLevel === "at_risk") {
    insights.push(`ควรติดตามอย่างใกล้ชิดและประเมินซ้ำในรอบถัดไป`);
  } else if (riskLevel === "normal") {
    insights.push(`ไม่พบความเสี่ยงที่ชัดเจนในขณะนี้ ควรประเมินตามรอบปกติ (ต้นภาค/กลางภาค/ปลายภาค)`);
  }

  return insights;
}

// ============================================================================
// Risk Profile System - extends Module 9's getAiRiskScore() composite
// function (welfare.ts) by also weighting in the latest SDQ total
// difficulties score, instead of building a second parallel risk engine.
// No new student_risk_profiles table - this is computed on demand.
// ============================================================================

export interface SdqAwareRiskProfile extends RiskScoreResult {
  latestSdq: { totalDifficultiesScore: number; riskLevel: SdqRiskLevel; assessmentDate: string } | null;
}

export async function getStudentRiskProfile(studentId: string): Promise<SdqAwareRiskProfile> {
  const supabase = await createClient();
  const [base, { data: latestScore }] = await Promise.all([
    getAiRiskScore(studentId),
    supabase
      .from("sdq_scores")
      .select("total_difficulties_score, risk_level, computed_at, sdq_assessments(assessment_date)")
      .eq("student_id", studentId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .returns<{ total_difficulties_score: number; risk_level: SdqRiskLevel; computed_at: string; sdq_assessments: { assessment_date: string } | null } | null>(),
  ]);

  if (!latestScore) {
    return { ...base, latestSdq: null };
  }

  // Weight the SDQ total difficulties score into the composite score: SDQ
  // contributes up to +20 points, scaled from its 0-40 range, on top of
  // Module 9's existing attendance/academic/economic/health/behavior/family
  // factors - one more input, not a second risk system.
  const sdqContribution = Math.round((latestScore.total_difficulties_score / 40) * 20);
  const newScore = Math.min(100, base.riskScore + sdqContribution);

  const factors = [...base.factors];
  if (latestScore.total_difficulties_score >= 14) {
    factors.push({
      domain: "พฤติกรรมและอารมณ์ (SDQ)",
      detail: `ผลประเมิน SDQ ล่าสุดอยู่ในระดับ "${sdqRiskLevelLabel[latestScore.risk_level]}" (คะแนนรวม ${latestScore.total_difficulties_score}/40)`,
    });
  }

  let riskLevel: RiskScoreResult["riskLevel"] = base.riskLevel;
  if (newScore >= 60) riskLevel = "critical";
  else if (newScore >= 40) riskLevel = "high";
  else if (newScore >= 20) riskLevel = "moderate";

  const recommendations = [...base.recommendations];
  if (latestScore.risk_level === "high_risk" || latestScore.risk_level === "critical") {
    recommendations.push("ผลประเมิน SDQ บ่งชี้ความเสี่ยงสูง ควรประสานงานกับผู้ปกครองและพิจารณาส่งต่อผู้เชี่ยวชาญด้านจิตวิทยา/แนะแนว");
  }

  return {
    riskLevel,
    riskScore: newScore,
    factors,
    recommendations,
    latestSdq: {
      totalDifficultiesScore: latestScore.total_difficulties_score,
      riskLevel: latestScore.risk_level,
      assessmentDate: latestScore.sdq_assessments?.assessment_date ?? latestScore.computed_at,
    },
  };
}

// ============================================================================
// Reports (computed on-demand - no stored "reports" table, same precedent
// as welfare.ts).
// ============================================================================

export async function getSdqIndividualReport(assessmentId: string) {
  const [assessment, analysis] = await Promise.all([getSdqAssessment(assessmentId), getAiSdqAnalysis(assessmentId)]);
  const supabase = await createClient();
  const { data: score } = await supabase.from("sdq_scores").select("*").eq("assessment_id", assessmentId).maybeSingle();
  return { assessment, score, analysis };
}

export async function getSdqRiskStudentReport(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sdq_scores")
    .select("*, students(full_name, student_code, classroom)")
    .eq("school_id", schoolId)
    .in("risk_level", ["at_risk", "high_risk", "critical"])
    .order("total_difficulties_score", { ascending: false });
  return data ?? [];
}

export async function getSdqSchoolSummaryReport(schoolId: string) {
  const [dashboard, classroomComparison, riskStudents] = await Promise.all([
    getSdqDashboard(schoolId),
    getSdqClassroomComparison(schoolId),
    getSdqRiskStudentReport(schoolId),
  ]);
  return { dashboard, classroomComparison, riskStudents };
}

export { getCurrentSchoolId };
