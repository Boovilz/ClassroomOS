/**
 * Shared data-fetching utilities for monthly tracking print reports.
 * Used by the lunch / milk / tooth-brush report pages.
 */
import { createClient } from "@/lib/supabase/server";
import type { MonthlyRecord, MonthSummary } from "@/components/reports/monthly-tracking-print";

// ---------------------------------------------------------------------------
// Thai month names (1-12)
// ---------------------------------------------------------------------------
const THAI_MONTH_NAMES: Record<number, string> = {
  1: "มกราคม",
  2: "กุมภาพันธ์",
  3: "มีนาคม",
  4: "เมษายน",
  5: "พฤษภาคม",
  6: "มิถุนายน",
  7: "กรกฎาคม",
  8: "สิงหาคม",
  9: "กันยายน",
  10: "ตุลาคม",
  11: "พฤศจิกายน",
  12: "ธันวาคม",
};

// Month -> semester in Thai academic year (May-Oct = 1, Nov-Apr = 2)
function getSemester(month: number): 1 | 2 {
  return month >= 5 && month <= 10 ? 1 : 2;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ---------------------------------------------------------------------------
// Common helpers
// ---------------------------------------------------------------------------
export interface SchoolContext {
  schoolId: string;
  schoolName: string;
  teacherName: string;
  principalName: string;
}

export async function getSchoolContext(
  grade: string,
  classroom: string
): Promise<SchoolContext | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("school_id, full_name")
    .eq("id", auth.user.id)
    .single();

  if (!profile?.school_id) return null;

  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("id", profile.school_id)
    .single();

  // Look up homeroom teacher for the classroom
  const { data: teacher } = await supabase
    .from("teachers")
    .select("homeroom_classroom, user_id")
    .eq("school_id", profile.school_id)
    .eq("homeroom_classroom", `${grade}/${classroom}`)
    .maybeSingle();

  let teacherName = "";
  if (teacher?.user_id) {
    const { data: teacherUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", teacher.user_id)
      .single();
    teacherName = teacherUser?.full_name ?? "";
  }

  return {
    schoolId: profile.school_id,
    schoolName: school?.name ?? "",
    teacherName,
    principalName: "",
  };
}

export async function getStudents(schoolId: string, grade: string, classroom: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, student_code, full_name")
    .eq("school_id", schoolId)
    .eq("grade", grade)
    .eq("classroom", classroom)
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("student_code");
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Academic year helpers
// ---------------------------------------------------------------------------
// BE year 2569 -> Gregorian 2026, start: 2026-05-01, end: 2027-04-30
function academicYearRange(beYear: number): { start: string; end: string } {
  const gYear = beYear - 543;
  return {
    start: `${gYear}-05-01`,
    end: `${gYear + 1}-04-30`,
  };
}

// Build the 12 MonthSummary shells for a BE year
function buildMonthShells(beYear: number): Array<{ gYear: number; month: number }> {
  const gYear = beYear - 543;
  return [
    // Semester 1: May–Oct of gYear
    { gYear, month: 5 },
    { gYear, month: 6 },
    { gYear, month: 7 },
    { gYear, month: 8 },
    { gYear, month: 9 },
    { gYear, month: 10 },
    // Semester 2: Nov–Dec of gYear, Jan–Apr of gYear+1
    { gYear, month: 11 },
    { gYear, month: 12 },
    { gYear: gYear + 1, month: 1 },
    { gYear: gYear + 1, month: 2 },
    { gYear: gYear + 1, month: 3 },
    { gYear: gYear + 1, month: 4 },
  ];
}

// ---------------------------------------------------------------------------
// Lunch report data
// ---------------------------------------------------------------------------
export async function buildLunchMonths(
  schoolId: string,
  grade: string,
  classroom: string,
  beYear: number
): Promise<MonthSummary[]> {
  const supabase = await createClient();
  const { start, end } = academicYearRange(beYear);

  const students = await getStudents(schoolId, grade, classroom);
  if (!students.length) return [];

  const studentIds = students.map((s) => s.id);

  // Fetch all meal_records for these students in the academic year (lunch type)
  const { data: records } = await supabase
    .from("meal_records")
    .select("student_id, date, status")
    .in("student_id", studentIds)
    .eq("meal_type", "lunch")
    .gte("date", start)
    .lte("date", end);

  // Group by student -> date -> status
  type DayStatus = "yes" | "no" | "absent";
  const byStudent = new Map<string, Map<string, DayStatus>>();
  for (const s of students) byStudent.set(s.id, new Map());

  for (const r of records ?? []) {
    const statusMap = byStudent.get(r.student_id);
    if (!statusMap) continue;
    let st: DayStatus = "absent";
    if (r.status === "served") st = "yes";
    else if (r.status === "special_diet") st = "no";
    else if (r.status === "absent") st = "absent";
    statusMap.set(r.date, st);
  }

  return buildMonthSummaries(students, byStudent, beYear);
}

// ---------------------------------------------------------------------------
// Milk / tooth-brush report data
// ---------------------------------------------------------------------------
export async function buildDailyRecordMonths(
  schoolId: string,
  grade: string,
  classroom: string,
  beYear: number,
  recordType: "milk" | "tooth_brush"
): Promise<MonthSummary[]> {
  const supabase = await createClient();
  const { start, end } = academicYearRange(beYear);

  const students = await getStudents(schoolId, grade, classroom);
  if (!students.length) return [];

  const studentIds = students.map((s) => s.id);

  const { data: records } = await supabase
    .from("classroom_daily_records")
    .select("student_id, date, status")
    .in("student_id", studentIds)
    .eq("record_type", recordType)
    .gte("date", start)
    .lte("date", end);

  type DayStatus = "yes" | "no" | "absent";
  const byStudent = new Map<string, Map<string, DayStatus>>();
  for (const s of students) byStudent.set(s.id, new Map());

  for (const r of records ?? []) {
    const statusMap = byStudent.get(r.student_id);
    if (!statusMap) continue;
    statusMap.set(r.date, r.status as DayStatus);
  }

  return buildMonthSummaries(students, byStudent, beYear);
}

// ---------------------------------------------------------------------------
// Shared month-summary builder
// ---------------------------------------------------------------------------
function buildMonthSummaries(
  students: Array<{ id: string; student_code: string; full_name: string }>,
  byStudent: Map<string, Map<string, "yes" | "no" | "absent">>,
  beYear: number
): MonthSummary[] {
  const shells = buildMonthShells(beYear);

  return shells.map(({ gYear, month }) => {
    const days = daysInMonth(gYear, month);
    const records: MonthlyRecord[] = students.map((s) => {
      const dayMap = byStudent.get(s.id) ?? new Map();
      const dayRecord: Record<number, "yes" | "no" | "absent" | null> = {};
      let totalOpen = 0;
      let totalYes = 0;
      let totalNo = 0;
      let totalAbsent = 0;

      for (let d = 1; d <= days; d++) {
        const dateStr = `${gYear}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const status = dayMap.get(dateStr) ?? null;
        dayRecord[d] = status;
        if (status !== null) {
          totalOpen++;
          if (status === "yes") totalYes++;
          else if (status === "no") totalNo++;
          else if (status === "absent") totalAbsent++;
        }
      }

      return {
        studentId: s.id,
        studentCode: s.student_code,
        studentName: s.full_name,
        days: dayRecord,
        totalOpen,
        totalYes,
        totalNo,
        totalAbsent,
      };
    });

    return {
      year: gYear,
      month,
      thaiMonth: THAI_MONTH_NAMES[month],
      semester: getSemester(month),
      daysInMonth: days,
      records,
    };
  });
}
