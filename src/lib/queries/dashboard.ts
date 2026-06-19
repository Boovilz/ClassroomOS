import { createClient } from "@/lib/supabase/server";

export interface DashboardSummary {
  totalStudents: number;
  presentToday: number;
  attendanceRatePercent: number;
  behaviorEventsThisWeek: number;
  totalXp: number;
  totalCoins: number;
}

/**
 * Aggregates the headline numbers shown on the dashboard summary cards.
 * Relies on RLS to automatically scope rows to the caller's role/school.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [studentsRes, attendanceTodayRes, behaviorRes, studentsAgg] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("attendance").select("status").eq("date", today),
    supabase
      .from("behavior_records")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", weekAgo),
    supabase.from("students").select("xp, coins"),
  ]);

  const totalStudents = studentsRes.count ?? 0;
  const presentToday =
    attendanceTodayRes.data?.filter((r) => r.status === "present" || r.status === "late").length ?? 0;
  const attendanceRatePercent = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;
  const behaviorEventsThisWeek = behaviorRes.count ?? 0;
  const totalXp = studentsAgg.data?.reduce((sum, s) => sum + (s.xp ?? 0), 0) ?? 0;
  const totalCoins = studentsAgg.data?.reduce((sum, s) => sum + (s.coins ?? 0), 0) ?? 0;

  return { totalStudents, presentToday, attendanceRatePercent, behaviorEventsThisWeek, totalXp, totalCoins };
}

// ============================================================================
// Header
// ============================================================================

export interface DashboardHeaderInfo {
  schoolName: string;
  logoUrl: string | null;
  teacherName: string;
  classroom: string | null;
  academicYear: number;
  semester: 1 | 2;
}

/** Thai school year runs roughly May-Apr; semester 1 = May-Oct, semester 2 = Nov-Apr. */
function currentAcademicPeriod(): { academicYear: number; semester: 1 | 2 } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const academicYear = (month >= 5 ? now.getFullYear() : now.getFullYear() - 1) + 543;
  const semester: 1 | 2 = month >= 5 && month <= 10 ? 1 : 2;
  return { academicYear, semester };
}

export async function getDashboardHeaderInfo(): Promise<DashboardHeaderInfo> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = auth?.user
    ? await supabase.from("users").select("full_name, school_id").eq("id", auth.user.id).single()
    : { data: null };

  const [{ data: school }, { data: teacher }] = await Promise.all([
    profile?.school_id
      ? supabase.from("schools").select("name, logo_url").eq("id", profile.school_id).single()
      : Promise.resolve({ data: null }),
    auth?.user
      ? supabase.from("teachers").select("homeroom_classroom").eq("user_id", auth.user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { academicYear, semester } = currentAcademicPeriod();

  return {
    schoolName: school?.name ?? "โรงเรียน",
    logoUrl: school?.logo_url ?? null,
    teacherName: profile?.full_name ?? "-",
    classroom: teacher?.homeroom_classroom ?? null,
    academicYear,
    semester,
  };
}

// ============================================================================
// Summary cards
// ============================================================================

export interface SummaryCardsData {
  students: { male: number; female: number; total: number };
  attendanceToday: { present: number; absent: number; sick: number; personalLeave: number; late: number };
  behavior: { averageScore: number; excellentStudents: number; riskStudents: number };
  gamification: { totalXp: number; totalCoins: number; classroomLevel: number };
  savings: { totalSavings: number; todaysDeposits: number; activeAccounts: number };
  health: { healthy: number; underweight: number; overweight: number; obesity: number };
}

function bmiCategory(heightCm: number, weightKg: number): "underweight" | "healthy" | "overweight" | "obesity" {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "overweight";
  return "obesity";
}

export async function getSummaryCardsData(): Promise<SummaryCardsData> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [studentsRes, attendanceTodayRes, behaviorRes, savingsAccountsRes, savingsTxRes, healthRes] =
    await Promise.all([
      supabase.from("students").select("gender, xp, coins, level"),
      supabase.from("attendance").select("status").eq("date", today),
      supabase.from("behavior_records").select("student_id, points"),
      supabase.from("finance_accounts").select("id, balance").eq("account_type", "savings"),
      supabase
        .from("finance_transactions")
        .select("amount, type, account_id, occurred_at")
        .eq("type", "income"),
      supabase.from("health_records").select("student_id, height_cm, weight_kg"),
    ]);

  const studentRows = studentsRes.data ?? [];
  const students = {
    male: studentRows.filter((s) => s.gender === "male").length,
    female: studentRows.filter((s) => s.gender === "female").length,
    total: studentRows.length,
  };

  const attendanceRows = attendanceTodayRes.data ?? [];
  const attendanceToday = {
    present: attendanceRows.filter((a) => a.status === "present").length,
    absent: attendanceRows.filter((a) => a.status === "absent").length,
    sick: attendanceRows.filter((a) => a.status === "sick").length,
    personalLeave: attendanceRows.filter((a) => a.status === "personal_leave").length,
    late: attendanceRows.filter((a) => a.status === "late").length,
  };

  const behaviorByStudent = new Map<string, number>();
  for (const row of behaviorRes.data ?? []) {
    behaviorByStudent.set(row.student_id, (behaviorByStudent.get(row.student_id) ?? 0) + row.points);
  }
  const behaviorScores = Array.from(behaviorByStudent.values());
  const behavior = {
    averageScore:
      behaviorScores.length > 0 ? Math.round(behaviorScores.reduce((a, b) => a + b, 0) / behaviorScores.length) : 0,
    excellentStudents: behaviorScores.filter((s) => s >= 10).length,
    riskStudents: behaviorScores.filter((s) => s < 0).length,
  };

  const totalXp = studentRows.reduce((sum, s) => sum + (s.xp ?? 0), 0);
  const totalCoins = studentRows.reduce((sum, s) => sum + (s.coins ?? 0), 0);
  const classroomLevel =
    studentRows.length > 0 ? Math.round(studentRows.reduce((s, r) => s + r.level, 0) / studentRows.length) : 1;

  const savingsAccountIds = new Set((savingsAccountsRes.data ?? []).map((a) => a.id));
  const totalSavings = (savingsAccountsRes.data ?? []).reduce((sum, a) => sum + Number(a.balance), 0);
  const todaysDeposits = (savingsTxRes.data ?? [])
    .filter((t) => savingsAccountIds.has(t.account_id) && t.occurred_at === today)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const activeAccounts = savingsAccountIds.size;

  const latestByStudent = new Map<string, { height_cm: number | null; weight_kg: number | null }>();
  for (const row of healthRes.data ?? []) {
    latestByStudent.set(row.student_id, { height_cm: row.height_cm, weight_kg: row.weight_kg });
  }
  const health = { healthy: 0, underweight: 0, overweight: 0, obesity: 0 };
  for (const row of latestByStudent.values()) {
    if (!row.height_cm || !row.weight_kg) continue;
    health[bmiCategory(Number(row.height_cm), Number(row.weight_kg))] += 1;
  }

  return {
    students,
    attendanceToday,
    behavior,
    gamification: { totalXp, totalCoins, classroomLevel },
    savings: { totalSavings, todaysDeposits, activeAccounts },
    health,
  };
}

// ============================================================================
// Analytics
// ============================================================================

export interface AttendanceAnalyticsPoint {
  label: string;
  present: number;
  absent: number;
  late: number;
}

export interface AttendanceAnalytics {
  daily: AttendanceAnalyticsPoint[];
  weekly: AttendanceAnalyticsPoint[];
  monthly: AttendanceAnalyticsPoint[];
}

export async function getAttendanceAnalytics(): Promise<AttendanceAnalytics> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await supabase.from("attendance").select("date, status").gte("date", since);
  const rows = data ?? [];

  const daily: AttendanceAnalyticsPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dayRows = rows.filter((r) => r.date === d);
    daily.push({
      label: new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      present: dayRows.filter((r) => r.status === "present").length,
      absent: dayRows.filter((r) => r.status === "absent").length,
      late: dayRows.filter((r) => r.status === "late").length,
    });
  }

  const weekly: AttendanceAnalyticsPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const weekRows = rows.filter((r) => r.date >= startStr && r.date <= endStr);
    weekly.push({
      label: start.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      present: weekRows.filter((r) => r.status === "present").length,
      absent: weekRows.filter((r) => r.status === "absent").length,
      late: weekRows.filter((r) => r.status === "late").length,
    });
  }

  const monthly: AttendanceAnalyticsPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7);
    const monthRows = rows.filter((r) => r.date.startsWith(monthStr));
    monthly.push({
      label: d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
      present: monthRows.filter((r) => r.status === "present").length,
      absent: monthRows.filter((r) => r.status === "absent").length,
      late: monthRows.filter((r) => r.status === "late").length,
    });
  }

  return { daily, weekly, monthly };
}

export interface AcademicAnalyticsPoint {
  subject: string;
  averageScore: number;
}

export async function getAcademicAnalytics(): Promise<AcademicAnalyticsPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scores")
    .select("score, max_score, subjects(name)")
    .returns<{ score: number; max_score: number; subjects: { name: string } | null }[]>();

  const bySubject = new Map<string, { total: number; count: number }>();
  for (const row of data ?? []) {
    const name = row.subjects?.name ?? "ไม่ระบุวิชา";
    const normalized = row.max_score > 0 ? (row.score / row.max_score) * 100 : row.score;
    const agg = bySubject.get(name) ?? { total: 0, count: 0 };
    agg.total += normalized;
    agg.count += 1;
    bySubject.set(name, agg);
  }

  return Array.from(bySubject.entries()).map(([subject, agg]) => ({
    subject,
    averageScore: agg.count > 0 ? Math.round(agg.total / agg.count) : 0,
  }));
}

export interface BehaviorAnalyticsPoint {
  label: string;
  positive: number;
  negative: number;
}

export async function getBehaviorAnalytics(): Promise<BehaviorAnalyticsPoint[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("behavior_records")
    .select("category, points, occurred_at")
    .gte("occurred_at", since);
  const rows = data ?? [];

  const weeks: BehaviorAnalyticsPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    const weekRows = rows.filter((r) => {
      const t = new Date(r.occurred_at).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    weeks.push({
      label: start.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      positive: weekRows.filter((r) => r.category === "positive").reduce((s, r) => s + r.points, 0),
      negative: weekRows.filter((r) => r.category === "negative").reduce((s, r) => s + Math.abs(r.points), 0),
    });
  }

  return weeks;
}

export interface FinanceAnalyticsPoint {
  label: string;
  deposits: number;
  withdrawals: number;
}

export async function getFinanceAnalytics(): Promise<{ trend: FinanceAnalyticsPoint[]; balance: number }> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: txData }, { data: accounts }] = await Promise.all([
    supabase.from("finance_transactions").select("type, amount, occurred_at").gte("occurred_at", since),
    supabase.from("finance_accounts").select("balance"),
  ]);

  const rows = txData ?? [];
  const trend: FinanceAnalyticsPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const weekRows = rows.filter((r) => r.occurred_at >= startStr && r.occurred_at <= endStr);
    trend.push({
      label: start.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      deposits: weekRows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0),
      withdrawals: weekRows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0),
    });
  }

  const balance = (accounts ?? []).reduce((sum, a) => sum + Number(a.balance), 0);
  return { trend, balance };
}

// ============================================================================
// Calendar
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: "exam" | "activity" | "parent_meeting" | "field_trip" | "holiday";
  classroom: string | null;
  starts_at: string;
  ends_at: string | null;
}

export async function getCalendarEvents(monthsAhead = 2): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - 1);
  const end = new Date();
  end.setMonth(end.getMonth() + monthsAhead);

  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, description, event_type, classroom, starts_at, ends_at")
    .gte("starts_at", start.toISOString())
    .lte("starts_at", end.toISOString())
    .order("starts_at");

  return data ?? [];
}

// ============================================================================
// Notifications
// ============================================================================

export interface DashboardNotification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  priority: "low" | "medium" | "high" | "critical";
  category: string | null;
  read_at: string | null;
  created_at: string;
}

export async function getNotifications(limit = 20): Promise<DashboardNotification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, priority, category, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ============================================================================
// Leaderboard
// ============================================================================

export interface LeaderboardEntry {
  id: string;
  full_name: string;
  student_code: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  coins: number;
  badgeCount: number;
}

export async function getTopStudents(limit = 10): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, student_code, avatar_url, level, xp, coins")
    .eq("is_active", true)
    .order("xp", { ascending: false })
    .limit(limit);

  if (!students || students.length === 0) return [];

  const { data: achievements } = await supabase
    .from("student_achievements")
    .select("student_id")
    .in("student_id", students.map((s) => s.id));

  const badgeCounts = new Map<string, number>();
  for (const row of achievements ?? []) {
    badgeCounts.set(row.student_id, (badgeCounts.get(row.student_id) ?? 0) + 1);
  }

  return students.map((s) => ({ ...s, badgeCount: badgeCounts.get(s.id) ?? 0 }));
}

// ============================================================================
// Recent activities
// ============================================================================

export interface RecentActivity {
  id: string;
  activity_type: string;
  description: string;
  occurred_at: string;
  student_name: string | null;
}

export async function getRecentActivities(limit = 15): Promise<RecentActivity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dashboard_activities")
    .select("id, activity_type, description, occurred_at, students(full_name)")
    .order("occurred_at", { ascending: false })
    .limit(limit)
    .returns<
      { id: string; activity_type: string; description: string; occurred_at: string; students: { full_name: string } | null }[]
    >();

  return (data ?? []).map((row) => ({
    id: row.id,
    activity_type: row.activity_type,
    description: row.description,
    occurred_at: row.occurred_at,
    student_name: row.students?.full_name ?? null,
  }));
}

// ============================================================================
// AI insights
// ============================================================================

export interface AiInsight {
  id: string;
  insight_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  recommendation: string;
  student_name: string | null;
}

/**
 * Reads cached insights from `dashboard_ai_insights` (populated by a
 * scheduled job or teacher-triggered analysis elsewhere) and, when the
 * cache is empty, derives a few rule-based insights on the fly so the
 * panel is never empty for a new school with no cached rows yet.
 */
export async function getAiInsights(): Promise<AiInsight[]> {
  const supabase = await createClient();
  const { data: cached } = await supabase
    .from("dashboard_ai_insights")
    .select("id, insight_type, severity, title, recommendation, students(full_name)")
    .is("dismissed_at", null)
    .order("generated_at", { ascending: false })
    .limit(10)
    .returns<
      {
        id: string;
        insight_type: string;
        severity: AiInsight["severity"];
        title: string;
        recommendation: string;
        students: { full_name: string } | null;
      }[]
    >();

  if (cached && cached.length > 0) {
    return cached.map((row) => ({ ...row, student_name: row.students?.full_name ?? null }));
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [{ data: students }, { data: attendance }, { data: behavior }] = await Promise.all([
    supabase.from("students").select("id, full_name"),
    supabase.from("attendance").select("student_id, status").gte("date", since),
    supabase.from("behavior_records").select("student_id, category, points"),
  ]);

  const insights: AiInsight[] = [];
  const byStudent = new Map(students?.map((s) => [s.id, s.full_name]) ?? []);

  const absencesByStudent = new Map<string, number>();
  for (const row of attendance ?? []) {
    if (row.status === "absent") absencesByStudent.set(row.student_id, (absencesByStudent.get(row.student_id) ?? 0) + 1);
  }
  for (const [studentId, count] of absencesByStudent) {
    if (count >= 3) {
      insights.push({
        id: `attendance-${studentId}`,
        insight_type: "attendance_risk",
        severity: count >= 5 ? "critical" : "high",
        title: `${byStudent.get(studentId) ?? "นักเรียน"} ขาดเรียนบ่อย`,
        recommendation: `ขาดเรียน ${count} ครั้งใน 14 วันล่าสุด ควรติดต่อผู้ปกครองหรือพิจารณาเยี่ยมบ้าน`,
        student_name: byStudent.get(studentId) ?? null,
      });
    }
  }

  const negativeByStudent = new Map<string, number>();
  for (const row of behavior ?? []) {
    if (row.category === "negative") negativeByStudent.set(row.student_id, (negativeByStudent.get(row.student_id) ?? 0) + Math.abs(row.points));
  }
  for (const [studentId, points] of negativeByStudent) {
    if (points >= 10) {
      insights.push({
        id: `behavior-${studentId}`,
        insight_type: "behavior_trend",
        severity: points >= 20 ? "critical" : "medium",
        title: `${byStudent.get(studentId) ?? "นักเรียน"} มีพฤติกรรมเชิงลบสะสมสูง`,
        recommendation: `คะแนนพฤติกรรมเชิงลบสะสม ${points} คะแนน ควรพูดคุยและวางแผนการปรับพฤติกรรม`,
        student_name: byStudent.get(studentId) ?? null,
      });
    }
  }

  return insights.slice(0, 10);
}
