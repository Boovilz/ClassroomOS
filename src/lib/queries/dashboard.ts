import { createClient } from "@/lib/supabase/server";

export interface DashboardSummary {
  totalStudents: number;
  presentToday: number;
  attendanceRatePercent: number;
  behaviorEventsThisWeek: number;
  totalXp: number;
  totalCoins: number;
}

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface PerformanceTrendPoint {
  term: string;
  averageScore: number;
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

/** Daily attendance counts for the last 7 days, for the line/bar chart. */
export async function getAttendanceTrend(): Promise<AttendanceTrendPoint[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data } = await supabase.from("attendance").select("date, status").gte("date", since);

  const byDate = new Map<string, AttendanceTrendPoint>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    byDate.set(d, { date: d, present: 0, absent: 0, late: 0 });
  }

  for (const row of data ?? []) {
    const point = byDate.get(row.date);
    if (!point) continue;
    if (row.status === "present") point.present += 1;
    else if (row.status === "late") point.late += 1;
    else if (row.status === "absent") point.absent += 1;
  }

  return Array.from(byDate.values());
}

/** Average score per term, for the performance trend chart. */
export async function getPerformanceTrend(): Promise<PerformanceTrendPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("scores").select("term, score, max_score");

  const byTerm = new Map<string, { total: number; count: number }>();
  for (const row of data ?? []) {
    const term = row.term ?? "ไม่ระบุภาคเรียน";
    const normalized = row.max_score > 0 ? (row.score / row.max_score) * 100 : row.score;
    const agg = byTerm.get(term) ?? { total: 0, count: 0 };
    agg.total += normalized;
    agg.count += 1;
    byTerm.set(term, agg);
  }

  return Array.from(byTerm.entries()).map(([term, agg]) => ({
    term,
    averageScore: agg.count > 0 ? Math.round(agg.total / agg.count) : 0,
  }));
}
