import { createClient } from "@/lib/supabase/server";
import type { AssessmentMethod, AssessmentType, GradebookComponent, RubricCriterion, RubricScoreEntry } from "@/lib/supabase/types";

// ============================================================================
// Thai letter grade (4 / 3.5 / 3 / 2.5 / 2 / 1.5 / 1 / 0) from a percentage.
// ============================================================================

export function percentToThaiGrade(percent: number): number {
  if (percent >= 80) return 4;
  if (percent >= 75) return 3.5;
  if (percent >= 70) return 3;
  if (percent >= 65) return 2.5;
  if (percent >= 60) return 2;
  if (percent >= 55) return 1.5;
  if (percent >= 50) return 1;
  return 0;
}

// ============================================================================
// Academic dashboard
// ============================================================================

export interface AcademicDashboard {
  gpa: number;
  subjectAverage: number;
  topStudents: { id: string; full_name: string; student_code: string; averagePercent: number }[];
  atRiskStudents: { id: string; full_name: string; student_code: string; averagePercent: number }[];
  assignmentCompletionRatePercent: number;
  learningOutcomeAchievementPercent: number;
  totalSubjects: number;
  totalAssignments: number;
}

export async function getAcademicDashboard(): Promise<AcademicDashboard> {
  const supabase = await createClient();

  const [{ data: scores }, { data: subjects }, { data: assignments }, { data: submissions }, { data: outcomes }] =
    await Promise.all([
      supabase.from("scores").select("student_id, score, max_score, students(full_name, student_code)").returns<
        { student_id: string; score: number; max_score: number; students: { full_name: string; student_code: string } | null }[]
      >(),
      supabase.from("subjects").select("id", { count: "exact", head: true }),
      supabase.from("assignments").select("id", { count: "exact", head: true }),
      supabase.from("assignment_submissions").select("status"),
      supabase.from("learning_outcomes").select("status"),
    ]);

  const rows = scores ?? [];
  const byStudent = new Map<string, { total: number; count: number; full_name: string; student_code: string }>();
  let totalPercent = 0;
  for (const row of rows) {
    const percent = row.max_score > 0 ? (row.score / row.max_score) * 100 : 0;
    totalPercent += percent;
    const agg = byStudent.get(row.student_id) ?? {
      total: 0,
      count: 0,
      full_name: row.students?.full_name ?? "-",
      student_code: row.students?.student_code ?? "-",
    };
    agg.total += percent;
    agg.count += 1;
    byStudent.set(row.student_id, agg);
  }

  const subjectAverage = rows.length > 0 ? Math.round(totalPercent / rows.length) : 0;
  const gpa = Math.round((percentToThaiGrade(subjectAverage) + Number.EPSILON) * 100) / 100;

  const studentAverages = Array.from(byStudent.entries()).map(([id, v]) => ({
    id,
    full_name: v.full_name,
    student_code: v.student_code,
    averagePercent: Math.round(v.total / v.count),
  }));
  const sorted = [...studentAverages].sort((a, b) => b.averagePercent - a.averagePercent);
  const topStudents = sorted.slice(0, 5);
  const atRiskStudents = sorted.filter((s) => s.averagePercent < 50).slice(-5).reverse();

  const submissionRows = submissions ?? [];
  const completed = submissionRows.filter((s) => s.status === "submitted" || s.status === "graded" || s.status === "returned").length;
  const assignmentCompletionRatePercent =
    submissionRows.length > 0 ? Math.round((completed / submissionRows.length) * 100) : 0;

  const outcomeRows = outcomes ?? [];
  const achieved = outcomeRows.filter((o) => o.status === "achieved").length;
  const learningOutcomeAchievementPercent = outcomeRows.length > 0 ? Math.round((achieved / outcomeRows.length) * 100) : 0;

  return {
    gpa,
    subjectAverage,
    topStudents,
    atRiskStudents,
    assignmentCompletionRatePercent,
    learningOutcomeAchievementPercent,
    totalSubjects: subjects?.length ?? 0,
    totalAssignments: assignments?.length ?? 0,
  };
}

// ============================================================================
// Subjects
// ============================================================================

export async function getSubjects() {
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("*, teachers(teacher_code)").order("name");
  return data ?? [];
}

export async function createSubject(params: {
  schoolId: string;
  name: string;
  code?: string;
  teacherId?: string;
  grade?: string;
  credits?: number;
  academicYear?: number;
  semester?: 1 | 2;
  description?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      school_id: params.schoolId,
      name: params.name,
      code: params.code ?? null,
      teacher_id: params.teacherId ?? null,
      grade: params.grade ?? null,
      credits: params.credits ?? 1,
      academic_year: params.academicYear ?? null,
      semester: params.semester ?? null,
      description: params.description ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Gradebook
// ============================================================================

export interface GradebookWeights {
  attendance_weight: number;
  homework_weight: number;
  assignment_weight: number;
  quiz_weight: number;
  midterm_weight: number;
  final_weight: number;
  project_weight: number;
  behavior_weight: number;
}

const DEFAULT_WEIGHTS: GradebookWeights = {
  attendance_weight: 10,
  homework_weight: 15,
  assignment_weight: 15,
  quiz_weight: 10,
  midterm_weight: 20,
  final_weight: 20,
  project_weight: 5,
  behavior_weight: 5,
};

export async function getGradebookWeights(subjectId: string): Promise<GradebookWeights> {
  const supabase = await createClient();
  const { data } = await supabase.from("gradebook_weights").select("*").eq("subject_id", subjectId).maybeSingle();
  if (!data) return DEFAULT_WEIGHTS;
  return data;
}

export async function setGradebookWeights(params: {
  schoolId: string;
  subjectId: string;
  weights: GradebookWeights;
}) {
  const supabase = await createClient();
  const sum = Object.values(params.weights).reduce((a, b) => a + b, 0);
  if (Math.round(sum) !== 100) {
    throw new Error(`น้ำหนักคะแนนรวมต้องเท่ากับ 100 (ปัจจุบัน ${sum})`);
  }
  const { data, error } = await supabase
    .from("gradebook_weights")
    .upsert(
      { school_id: params.schoolId, subject_id: params.subjectId, ...params.weights },
      { onConflict: "subject_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface GradebookRow {
  studentId: string;
  fullName: string;
  studentCode: string;
  componentAverages: Record<string, number>;
  weightedScore: number;
  letterGrade: number;
}

export async function getGradebook(subjectId: string): Promise<GradebookRow[]> {
  const supabase = await createClient();
  const [{ data: scores }, weights] = await Promise.all([
    supabase
      .from("scores")
      .select("student_id, score, max_score, component, students(full_name, student_code)")
      .eq("subject_id", subjectId)
      .returns<
        {
          student_id: string;
          score: number;
          max_score: number;
          component: string | null;
          students: { full_name: string; student_code: string } | null;
        }[]
      >(),
    getGradebookWeights(subjectId),
  ]);

  const byStudent = new Map<
    string,
    { fullName: string; studentCode: string; componentTotals: Map<string, { total: number; count: number }> }
  >();

  for (const row of scores ?? []) {
    const component = row.component ?? "assignment";
    const entry = byStudent.get(row.student_id) ?? {
      fullName: row.students?.full_name ?? "-",
      studentCode: row.students?.student_code ?? "-",
      componentTotals: new Map(),
    };
    const percent = row.max_score > 0 ? (row.score / row.max_score) * 100 : 0;
    const compAgg = entry.componentTotals.get(component) ?? { total: 0, count: 0 };
    compAgg.total += percent;
    compAgg.count += 1;
    entry.componentTotals.set(component, compAgg);
    byStudent.set(row.student_id, entry);
  }

  const weightKeyMap: Record<string, keyof GradebookWeights> = {
    attendance: "attendance_weight",
    homework: "homework_weight",
    assignment: "assignment_weight",
    quiz: "quiz_weight",
    midterm: "midterm_weight",
    final: "final_weight",
    project: "project_weight",
    behavior: "behavior_weight",
  };

  const result: GradebookRow[] = [];
  for (const [studentId, entry] of byStudent.entries()) {
    const componentAverages: Record<string, number> = {};
    let weightedScore = 0;
    for (const [component, weightKey] of Object.entries(weightKeyMap)) {
      const agg = entry.componentTotals.get(component);
      const avg = agg && agg.count > 0 ? agg.total / agg.count : 0;
      componentAverages[component] = Math.round(avg);
      weightedScore += (avg * weights[weightKey]) / 100;
    }
    weightedScore = Math.round(weightedScore);
    result.push({
      studentId,
      fullName: entry.fullName,
      studentCode: entry.studentCode,
      componentAverages,
      weightedScore,
      letterGrade: percentToThaiGrade(weightedScore),
    });
  }

  return result.sort((a, b) => a.studentCode.localeCompare(b.studentCode));
}

export async function recordScore(params: {
  schoolId: string;
  studentId: string;
  subjectId: string;
  assignmentId?: string;
  score: number;
  maxScore?: number;
  term?: string;
  assessmentType?: AssessmentType;
  method?: AssessmentMethod;
  component?: GradebookComponent;
  recordedBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      subject_id: params.subjectId,
      assignment_id: params.assignmentId ?? null,
      score: params.score,
      max_score: params.maxScore ?? 100,
      term: params.term ?? null,
      assessment_type: params.assessmentType ?? null,
      method: params.method ?? null,
      component: params.component ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Assignments
// ============================================================================

export async function getAssignments(subjectId?: string) {
  const supabase = await createClient();
  let query = supabase.from("assignments").select("*, subjects(name)").order("due_date", { ascending: true });
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data } = await query;
  return data ?? [];
}

export async function createAssignment(params: {
  schoolId: string;
  subjectId: string;
  title: string;
  description?: string;
  maxScore?: number;
  dueDate?: string;
  fileUrl?: string;
  assessmentType?: AssessmentType;
  method?: AssessmentMethod;
  rubricId?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .insert({
      school_id: params.schoolId,
      subject_id: params.subjectId,
      title: params.title,
      description: params.description ?? null,
      max_score: params.maxScore ?? 100,
      due_date: params.dueDate ?? null,
      file_url: params.fileUrl ?? null,
      assessment_type: params.assessmentType ?? null,
      method: params.method ?? null,
      rubric_id: params.rubricId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitAssignment(params: {
  schoolId: string;
  assignmentId: string;
  studentId: string;
  fileUrl?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("assignments").select("due_date").eq("id", params.assignmentId).single();
  const now = new Date();
  const isLate = assignment?.due_date ? now > new Date(assignment.due_date) : false;

  const { data, error } = await supabase
    .from("assignment_submissions")
    .upsert(
      {
        school_id: params.schoolId,
        assignment_id: params.assignmentId,
        student_id: params.studentId,
        status: isLate ? "late" : "submitted",
        file_url: params.fileUrl ?? null,
        notes: params.notes ?? null,
        submitted_at: now.toISOString(),
      },
      { onConflict: "assignment_id,student_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSubmissions(assignmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignment_submissions")
    .select("*, students(full_name, student_code)")
    .eq("assignment_id", assignmentId);
  return data ?? [];
}

// ============================================================================
// Rubrics
// ============================================================================

export async function getRubrics(subjectId?: string) {
  const supabase = await createClient();
  let query = supabase.from("rubrics").select("*").order("created_at", { ascending: false });
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data } = await query;
  return data ?? [];
}

export async function createRubric(params: {
  schoolId: string;
  subjectId: string;
  title: string;
  criteria: RubricCriterion[];
  createdBy?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rubrics")
    .insert({
      school_id: params.schoolId,
      subject_id: params.subjectId,
      title: params.title,
      criteria: params.criteria,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function scoreRubric(params: {
  schoolId: string;
  rubricId: string;
  studentId: string;
  assignmentId?: string;
  scores: RubricScoreEntry[];
  scoredBy?: string;
}) {
  const supabase = await createClient();
  const totalScore = params.scores.reduce((sum, s) => sum + s.points, 0);
  const { data, error } = await supabase
    .from("rubric_scores")
    .insert({
      school_id: params.schoolId,
      rubric_id: params.rubricId,
      student_id: params.studentId,
      assignment_id: params.assignmentId ?? null,
      scores: params.scores,
      total_score: totalScore,
      scored_by: params.scoredBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRubricScores(rubricId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rubric_scores")
    .select("*, students(full_name, student_code)")
    .eq("rubric_id", rubricId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================================
// Learning standards & outcomes
// ============================================================================

export async function getLearningStandards(subjectId?: string) {
  const supabase = await createClient();
  let query = supabase.from("learning_standards").select("*, subjects(name)").order("code");
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data } = await query;
  return data ?? [];
}

export async function createLearningStandard(params: {
  schoolId: string;
  subjectId: string;
  code: string;
  description: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_standards")
    .insert({ school_id: params.schoolId, subject_id: params.subjectId, code: params.code, description: params.description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLearningOutcomes(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("learning_outcomes")
    .select("*, learning_standards(code, description, subjects(name))")
    .eq("student_id", studentId)
    .order("assessed_at", { ascending: false });
  return data ?? [];
}

export async function recordLearningOutcome(params: {
  schoolId: string;
  studentId: string;
  standardId: string;
  status: "achieved" | "partially_achieved" | "needs_improvement";
  assessedBy?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_outcomes")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      standard_id: params.standardId,
      status: params.status,
      assessed_by: params.assessedBy ?? null,
      notes: params.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Student academic summary (report card / ปพ.5 / ปพ.6 source data)
// ============================================================================

export interface SubjectGradeSummary {
  subjectName: string;
  subjectCode: string | null;
  credits: number;
  averagePercent: number;
  letterGrade: number;
}

export interface StudentAcademicSummary {
  studentId: string;
  fullName: string;
  studentCode: string;
  classroom: string | null;
  grade: string | null;
  subjectGrades: SubjectGradeSummary[];
  gpa: number;
  attendanceRatePercent: number;
  behaviorScore: number;
  learningOutcomes: { code: string; description: string; status: string }[];
}

export async function getStudentAcademicSummary(studentId: string): Promise<StudentAcademicSummary> {
  const supabase = await createClient();

  const [{ data: student }, { data: scores }, { data: attendance }, outcomes] = await Promise.all([
    supabase.from("students").select("full_name, student_code, classroom, grade, behavior_score").eq("id", studentId).single(),
    supabase
      .from("scores")
      .select("score, max_score, subjects(name, code, credits)")
      .eq("student_id", studentId)
      .returns<{ score: number; max_score: number; subjects: { name: string; code: string | null; credits: number } | null }[]>(),
    supabase.from("attendance").select("status").eq("student_id", studentId),
    getLearningOutcomes(studentId),
  ]);

  if (!student) throw new Error("Student not found");

  const bySubject = new Map<string, { total: number; count: number; code: string | null; credits: number }>();
  for (const row of scores ?? []) {
    const name = row.subjects?.name ?? "ไม่ระบุวิชา";
    const percent = row.max_score > 0 ? (row.score / row.max_score) * 100 : 0;
    const agg = bySubject.get(name) ?? { total: 0, count: 0, code: row.subjects?.code ?? null, credits: row.subjects?.credits ?? 1 };
    agg.total += percent;
    agg.count += 1;
    bySubject.set(name, agg);
  }

  const subjectGrades: SubjectGradeSummary[] = Array.from(bySubject.entries()).map(([name, agg]) => {
    const averagePercent = Math.round(agg.total / agg.count);
    return {
      subjectName: name,
      subjectCode: agg.code,
      credits: agg.credits,
      averagePercent,
      letterGrade: percentToThaiGrade(averagePercent),
    };
  });

  const totalCredits = subjectGrades.reduce((sum, s) => sum + s.credits, 0);
  const gpa =
    totalCredits > 0
      ? Math.round(((subjectGrades.reduce((sum, s) => sum + s.letterGrade * s.credits, 0) / totalCredits) + Number.EPSILON) * 100) / 100
      : 0;

  const attendanceRows = attendance ?? [];
  const presentLike = attendanceRows.filter((a) => a.status === "present" || a.status === "late").length;
  const attendanceRatePercent = attendanceRows.length > 0 ? Math.round((presentLike / attendanceRows.length) * 100) : 0;

  return {
    studentId,
    fullName: student.full_name,
    studentCode: student.student_code,
    classroom: student.classroom,
    grade: student.grade,
    subjectGrades,
    gpa,
    attendanceRatePercent,
    behaviorScore: (student as { behavior_score?: number }).behavior_score ?? 100,
    learningOutcomes: (outcomes as unknown as { status: string; learning_standards: { code: string; description: string } | null }[]).map((o) => ({
      code: o.learning_standards?.code ?? "-",
      description: o.learning_standards?.description ?? "-",
      status: o.status,
    })),
  };
}

// ============================================================================
// AI academic analysis (rule-based, no external calls)
// ============================================================================

export async function getAiAcademicAnalysis(studentId: string): Promise<string[]> {
  const summary = await getStudentAcademicSummary(studentId);
  const insights: string[] = [];

  const strongSubjects = summary.subjectGrades.filter((s) => s.averagePercent >= 80);
  const weakSubjects = summary.subjectGrades.filter((s) => s.averagePercent < 50);

  if (strongSubjects.length > 0) {
    insights.push(
      `${summary.fullName} มีผลการเรียนดีเยี่ยมในวิชา ${strongSubjects.map((s) => s.subjectName).join(", ")} ควรได้รับการส่งเสริมต่อยอด`
    );
  }
  if (weakSubjects.length > 0) {
    insights.push(
      `${summary.fullName} มีผลการเรียนต่ำกว่าเกณฑ์ในวิชา ${weakSubjects.map((s) => s.subjectName).join(", ")} ควรจัดสอนเสริมหรือติว`
    );
  }
  if (summary.gpa >= 3.5) {
    insights.push(`เกรดเฉลี่ยสะสม ${summary.gpa} อยู่ในระดับดีเยี่ยม`);
  } else if (summary.gpa < 2) {
    insights.push(`เกรดเฉลี่ยสะสม ${summary.gpa} อยู่ในระดับที่ต้องเฝ้าระวัง ควรวางแผนพัฒนาผลการเรียนร่วมกับผู้ปกครอง`);
  }
  if (summary.attendanceRatePercent < 80) {
    insights.push(`อัตราการเข้าเรียน ${summary.attendanceRatePercent}% ค่อนข้างต่ำ ซึ่งอาจส่งผลต่อผลการเรียน ควรติดตามการเข้าเรียนควบคู่กัน`);
  }
  const needsImprovement = summary.learningOutcomes.filter((o) => o.status === "needs_improvement");
  if (needsImprovement.length > 0) {
    insights.push(`มาตรฐานการเรียนรู้ที่ยังต้องพัฒนา: ${needsImprovement.map((o) => o.code).join(", ")}`);
  }
  if (insights.length === 0) {
    insights.push(`${summary.fullName} มีผลการเรียนอยู่ในเกณฑ์ปกติ ไม่พบจุดที่ต้องเฝ้าระวังเป็นพิเศษในขณะนี้`);
  }

  return insights;
}

// ============================================================================
// Certificates
// ============================================================================

export async function issueCertificate(params: {
  schoolId: string;
  studentId: string;
  templateType: "graduation" | "honor_roll" | "perfect_attendance" | "subject_excellence" | "completion" | "other";
  title: string;
  description?: string;
  issuedBy?: string;
  fileUrl?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_certificates")
    .insert({
      school_id: params.schoolId,
      student_id: params.studentId,
      template_type: params.templateType,
      title: params.title,
      description: params.description ?? null,
      issued_by: params.issuedBy ?? null,
      file_url: params.fileUrl ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCertificates(studentId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("academic_certificates")
    .select("*, students(full_name, student_code)")
    .order("issued_at", { ascending: false });
  if (studentId) query = query.eq("student_id", studentId);
  const { data } = await query;
  return data ?? [];
}
