import { createClient } from "@/lib/supabase/server";
import { Pp5SubjectPrint } from "./pp5-subject-print-component";

export default async function Pp5SubjectPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; classroom?: string }>;
}) {
  const { subjectId, classroom } = await searchParams;
  const supabase = await createClient();

  if (!subjectId) {
    return <p className="p-8 text-center text-muted-foreground">กรุณาระบุรหัสวิชา (?subjectId=...)</p>;
  }

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id, full_name").eq("id", auth.user.id).single()
    : { data: null };

  const [{ data: subject }, schoolResult] = await Promise.all([
    (supabase as any)
      .from("subjects")
      .select("id, code, name, credits, grade, academic_year, semester, teacher_id, teacher:teacher_id(full_name)")
      .eq("id", subjectId)
      .single(),
    profile?.school_id
      ? supabase.from("schools").select("name, address").eq("id", profile.school_id).single()
      : Promise.resolve({ data: null }),
  ]);

  if (!subject) {
    return <p className="p-8 text-center text-muted-foreground">ไม่พบรายวิชา</p>;
  }

  const teacherName =
    (subject.teacher as { full_name?: string } | null)?.full_name ??
    profile?.full_name ??
    "-";

  // Students in this class
  const gradeFilter = subject.grade ?? null;
  let studentsQuery = (supabase as any)
    .from("students")
    .select("id, student_code, full_name, classroom")
    .eq("school_id", profile?.school_id ?? "")
    .is("deleted_at", null)
    .order("student_code");
  if (classroom) studentsQuery = studentsQuery.eq("classroom", classroom);
  else if (gradeFilter) studentsQuery = studentsQuery.eq("grade", gradeFilter);

  const { data: students } = await studentsQuery;
  const studentList = (students ?? []) as { id: string; student_code: string; full_name: string; classroom: string | null }[];

  // Attendance counts per student
  const studentIds = studentList.map((s) => s.id);
  type AttRow = { student_id: string; status: string };
  let attRows: AttRow[] = [];
  if (studentIds.length > 0) {
    const { data } = await (supabase as any)
      .from("attendance")
      .select("student_id, status")
      .in("student_id", studentIds);
    attRows = (data ?? []) as AttRow[];
  }

  type AttSummary = { present: number; late: number; sick: number; personal: number; absent: number };
  const attMap = new Map<string, AttSummary>();
  for (const r of attRows) {
    if (!attMap.has(r.student_id)) attMap.set(r.student_id, { present: 0, late: 0, sick: 0, personal: 0, absent: 0 });
    const e = attMap.get(r.student_id)!;
    if (r.status === "present") e.present++;
    else if (r.status === "late") e.late++;
    else if (r.status === "sick") e.sick++;
    else if (r.status === "personal_leave") e.personal++;
    else if (r.status === "absent") e.absent++;
  }

  // Scores for this subject
  type ScoreRow = { student_id: string; score: number; max_score: number; term: string | null };
  let scoreRows: ScoreRow[] = [];
  if (studentIds.length > 0) {
    const { data } = await (supabase as any)
      .from("scores")
      .select("student_id, score, max_score, term")
      .eq("subject_id", subjectId)
      .in("student_id", studentIds);
    scoreRows = (data ?? []) as ScoreRow[];
  }

  // Aggregate scores: midterm (term="midterm"), final (term="final"), total
  type StudentScores = { midterm: number | null; final: number | null; total: number | null; grade: string };
  const scoreMap = new Map<string, StudentScores>();

  function toGrade(total: number | null): string {
    if (total === null) return "-";
    if (total >= 80) return "4";
    if (total >= 75) return "3.5";
    if (total >= 70) return "3";
    if (total >= 65) return "2.5";
    if (total >= 60) return "2";
    if (total >= 55) return "1.5";
    if (total >= 50) return "1";
    return "0";
  }

  for (const r of scoreRows) {
    if (!scoreMap.has(r.student_id)) scoreMap.set(r.student_id, { midterm: null, final: null, total: null, grade: "-" });
    const e = scoreMap.get(r.student_id)!;
    const pct = r.max_score > 0 ? (r.score / r.max_score) * 100 : 0;
    if (r.term === "midterm") e.midterm = Math.round(pct * 10) / 10;
    else if (r.term === "final") e.final = Math.round(pct * 10) / 10;
    else {
      // no term — treat as total score percentage
      e.total = Math.round(pct * 10) / 10;
    }
  }
  for (const [sid, e] of scoreMap.entries()) {
    if (e.total === null && (e.midterm !== null || e.final !== null)) {
      const mid = e.midterm ?? 0;
      const fin = e.final ?? 0;
      e.total = Math.round(((mid + fin) / 2) * 10) / 10;
    }
    e.grade = toGrade(e.total);
    scoreMap.set(sid, e);
  }

  const studentRows = studentList.map((s, i) => {
    const att = attMap.get(s.id) ?? { present: 0, late: 0, sick: 0, personal: 0, absent: 0 };
    const sc = scoreMap.get(s.id) ?? { midterm: null, final: null, total: null, grade: "-" };
    const totalDays = att.present + att.late + att.sick + att.personal + att.absent;
    const attPct = totalDays > 0 ? Math.round(((att.present + att.late) / totalDays) * 1000) / 10 : null;
    return {
      no: i + 1,
      student_code: s.student_code,
      full_name: s.full_name,
      classroom: s.classroom,
      att_present: att.present + att.late,
      att_sick: att.sick,
      att_personal: att.personal,
      att_absent: att.absent,
      att_total: totalDays,
      att_pct: attPct,
      midterm: sc.midterm,
      final: sc.final,
      total: sc.total,
      grade: sc.grade,
    };
  });

  // Grade distribution
  const gradeCount = { "4": 0, "3.5": 0, "3": 0, "2.5": 0, "2": 0, "1.5": 0, "1": 0, "0": 0, "-": 0 };
  for (const r of studentRows) {
    const g = r.grade as keyof typeof gradeCount;
    if (g in gradeCount) gradeCount[g]++;
    else gradeCount["-"]++;
  }

  return (
    <Pp5SubjectPrint
      schoolName={(schoolResult as any)?.data?.name ?? ""}
      subjectCode={subject.code ?? ""}
      subjectName={subject.name}
      credits={subject.credits ?? 1}
      grade={subject.grade ?? ""}
      classroom={classroom ?? ""}
      academicYear={subject.academic_year ?? new Date().getFullYear() + 543}
      semester={subject.semester ?? 1}
      teacherName={teacherName}
      students={studentRows}
      gradeCount={gradeCount}
    />
  );
}
