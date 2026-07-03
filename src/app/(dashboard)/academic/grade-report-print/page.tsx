import { createClient } from "@/lib/supabase/server";
import { GradeReportPrintClient } from "./grade-report-print-client";

export default async function GradeReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; classroom?: string; year?: string; semester?: string }>;
}) {
  const { grade, classroom, year, semester } = await searchParams;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  if (!profile?.school_id) {
    return <p className="p-8 text-center text-muted-foreground">ไม่พบข้อมูลโรงเรียน</p>;
  }

  const schoolId = profile.school_id;
  const beYear = year ? parseInt(year) : new Date().getFullYear() + 543;
  const sem = semester ? parseInt(semester) : 1;

  const [{ data: school }, { data: studentsRaw }, { data: subjectsRaw }] = await Promise.all([
    supabase.from("schools").select("name").eq("id", schoolId).single(),
    supabase
      .from("students")
      .select("id, student_code, full_name, classroom")
      .eq("school_id", schoolId)
      .match(grade ? { grade } : {})
      .match(classroom ? { classroom } : {})
      .is("deleted_at", null)
      .order("student_code"),
    supabase
      .from("subjects")
      .select("id, code, name, credits, grade")
      .eq("school_id", schoolId)
      .eq("academic_year", beYear)
      .eq("semester", sem as 1 | 2)
      .order("code"),
  ]);

  const students = studentsRaw ?? [];
  const subjects = subjectsRaw ?? [];

  // Fetch all scores for these students × subjects
  const studentIds = students.map((s) => s.id);
  const subjectIds = subjects.map((s) => s.id);

  type ScoreRow = { student_id: string; subject_id: string; score: number; max_score: number };
  let scores: ScoreRow[] = [];
  if (studentIds.length > 0 && subjectIds.length > 0) {
    const { data: scoresRaw } = await (supabase as any)
      .from("scores")
      .select("student_id, subject_id, score, max_score")
      .in("student_id", studentIds)
      .in("subject_id", subjectIds);
    scores = (scoresRaw ?? []) as ScoreRow[];
  }

  // Build score map: student_id → subject_id → percentage score
  const scoreMap = new Map<string, Map<string, number>>();
  for (const row of scores) {
    if (!scoreMap.has(row.student_id)) scoreMap.set(row.student_id, new Map());
    const pct = row.max_score > 0 ? (row.score / row.max_score) * 100 : 0;
    const existing = scoreMap.get(row.student_id)!.get(row.subject_id);
    if (existing === undefined) {
      scoreMap.get(row.student_id)!.set(row.subject_id, pct);
    }
  }

  type StudentRow = {
    id: string;
    student_code: string;
    full_name: string;
    classroom: string | null;
    scores: (number | null)[];
    average: number | null;
    rank?: number;
  };

  const rows: StudentRow[] = students.map((s) => {
    const subjectScores = subjects.map((sub) => {
      const pct = scoreMap.get(s.id)?.get(sub.id);
      return pct !== undefined ? Math.round(pct * 10) / 10 : null;
    });
    const valid = subjectScores.filter((v) => v !== null) as number[];
    const average = valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : null;
    return { id: s.id, student_code: s.student_code, full_name: s.full_name, classroom: s.classroom, scores: subjectScores, average };
  });

  // Rank by average descending
  const sorted = [...rows].filter((r) => r.average !== null).sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  sorted.forEach((r, i) => { r.rank = i + 1; });

  return (
    <GradeReportPrintClient
      schoolName={school?.name ?? ""}
      grade={grade ?? ""}
      classroom={classroom ?? ""}
      beYear={beYear}
      semester={sem}
      subjects={subjects.map((s) => ({ id: s.id, code: s.code ?? "", name: s.name, credits: s.credits ?? 1 }))}
      students={rows}
    />
  );
}
