import { createClient } from "@/lib/supabase/server";
import { generateQrToken, verifyQrToken } from "@/lib/qr/token";
import type { AttendanceMode, AttendanceStatus } from "@/lib/supabase/types";

// ============================================================================
// Settings
// ============================================================================

export interface AttendanceSettingsRow {
  school_id: string;
  present_cutoff_time: string;
  late_cutoff_time: string;
  pending_cutoff_time: string;
  qr_token_ttl_seconds: number;
  risk_absence_threshold: number;
  risk_consecutive_threshold: number;
}

const DEFAULT_SETTINGS: Omit<AttendanceSettingsRow, "school_id"> = {
  present_cutoff_time: "08:30:00",
  late_cutoff_time: "09:00:00",
  pending_cutoff_time: "12:00:00",
  qr_token_ttl_seconds: 300,
  risk_absence_threshold: 3,
  risk_consecutive_threshold: 2,
};

/** Reads the school's attendance_settings row, creating it with defaults if missing. */
export async function getAttendanceSettings(): Promise<AttendanceSettingsRow> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  if (!profile?.school_id) {
    return { school_id: "", ...DEFAULT_SETTINGS };
  }

  const { data: existing } = await supabase
    .from("attendance_settings")
    .select("*")
    .eq("school_id", profile.school_id)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabase
    .from("attendance_settings")
    .insert({ school_id: profile.school_id, ...DEFAULT_SETTINGS })
    .select("*")
    .single();

  return created ?? { school_id: profile.school_id, ...DEFAULT_SETTINGS };
}

/** Derives a status from check-in time vs the configured cutoffs. */
function deriveStatus(checkInTime: Date, settings: AttendanceSettingsRow): AttendanceStatus {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const minutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
  if (minutes <= toMinutes(settings.present_cutoff_time)) return "present";
  if (minutes <= toMinutes(settings.late_cutoff_time)) return "late";
  return "late";
}

// ============================================================================
// Today summary
// ============================================================================

export interface TodayAttendanceSummary {
  date: string;
  present: number;
  late: number;
  absent: number;
  sick: number;
  personalLeave: number;
  totalStudents: number;
  pending: number;
  records: {
    id: string;
    student_id: string;
    full_name: string;
    student_code: string;
    classroom: string | null;
    avatar_url: string | null;
    status: AttendanceStatus;
    check_in_time: string | null;
    mode: AttendanceMode;
    method: string;
  }[];
}

export async function getTodayAttendanceSummary(): Promise<TodayAttendanceSummary> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: students }, { data: records }] = await Promise.all([
    supabase.from("students").select("id").eq("is_active", true).is("deleted_at", null),
    supabase
      .from("attendance")
      .select("id, student_id, status, check_in_time, mode, method, students(full_name, student_code, classroom, avatar_url, deleted_at)")
      .eq("date", today)
      .returns<
        {
          id: string;
          student_id: string;
          status: AttendanceStatus;
          check_in_time: string | null;
          mode: AttendanceMode;
          method: string;
          students: { full_name: string; student_code: string; classroom: string | null; avatar_url: string | null; deleted_at: string | null } | null;
        }[]
      >(),
  ]);

  const totalStudents = students?.length ?? 0;
  const rows = (records ?? []).filter((r) => !r.students || !r.students.deleted_at);

  return {
    date: today,
    present: rows.filter((r) => r.status === "present").length,
    late: rows.filter((r) => r.status === "late").length,
    absent: rows.filter((r) => r.status === "absent").length,
    sick: rows.filter((r) => r.status === "sick").length,
    personalLeave: rows.filter((r) => r.status === "personal_leave").length,
    totalStudents,
    pending: Math.max(totalStudents - rows.length, 0),
    records: rows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      full_name: r.students?.full_name ?? "-",
      student_code: r.students?.student_code ?? "-",
      classroom: r.students?.classroom ?? null,
      avatar_url: r.students?.avatar_url ?? null,
      status: r.status,
      check_in_time: r.check_in_time,
      mode: r.mode,
      method: r.method,
    })),
  };
}

// ============================================================================
// Attendance table (filtered list for the data table / reports)
// ============================================================================

export interface AttendanceTableFilters {
  dateFrom?: string;
  dateTo?: string;
  classroom?: string;
  status?: AttendanceStatus;
  studentId?: string;
}

export interface AttendanceTableRow {
  id: string;
  student_id: string;
  full_name: string;
  student_code: string;
  classroom: string | null;
  date: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  mode: AttendanceMode;
  method: string;
  note: string | null;
  approved_by: string | null;
  override_note: string | null;
}

export async function getAttendanceTable(filters: AttendanceTableFilters = {}): Promise<AttendanceTableRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("attendance")
    .select(
      "id, student_id, date, status, check_in_time, check_out_time, mode, method, note, approved_by, override_note, students(full_name, student_code, classroom, deleted_at)"
    );

  if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("date", filters.dateTo);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.studentId) query = query.eq("student_id", filters.studentId);

  const { data } = await query
    .order("date", { ascending: false })
    .returns<
      (Omit<AttendanceTableRow, "full_name" | "student_code" | "classroom"> & {
        students: { full_name: string; student_code: string; classroom: string | null; deleted_at: string | null } | null;
      })[]
    >();

  const rows = (data ?? [])
    .filter((r) => !r.students || !r.students.deleted_at)
    .map((r) => ({
    id: r.id,
    student_id: r.student_id,
    full_name: r.students?.full_name ?? "-",
    student_code: r.students?.student_code ?? "-",
    classroom: r.students?.classroom ?? null,
    date: r.date,
    status: r.status,
    check_in_time: r.check_in_time,
    check_out_time: r.check_out_time,
    mode: r.mode,
    method: r.method,
    note: r.note,
    approved_by: r.approved_by,
    override_note: r.override_note,
  }));

  return filters.classroom ? rows.filter((r) => r.classroom === filters.classroom) : rows;
}

// ============================================================================
// Reports
// ============================================================================

export interface AttendanceReportPeriod {
  from: string;
  to: string;
}

export interface AttendanceReportRow {
  student_id: string;
  full_name: string;
  student_code: string;
  classroom: string | null;
  present: number;
  late: number;
  absent: number;
  sick: number;
  personalLeave: number;
  totalDays: number;
  attendanceRatePercent: number;
}

/** Generated on-demand from `attendance` — no stored report table. */
export async function getAttendanceReport(period: AttendanceReportPeriod): Promise<AttendanceReportRow[]> {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, student_code, classroom")
    .eq("is_active", true)
    .is("deleted_at", null);
  const studentRows = students ?? [];
  if (studentRows.length === 0) return [];

  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("student_id, status")
    .gte("date", period.from)
    .lte("date", period.to)
    .in("student_id", studentRows.map((s) => s.id));

  const byStudent = new Map<string, { present: number; late: number; absent: number; sick: number; personalLeave: number; total: number }>();
  for (const row of attendanceRows ?? []) {
    const agg = byStudent.get(row.student_id) ?? { present: 0, late: 0, absent: 0, sick: 0, personalLeave: 0, total: 0 };
    agg.total += 1;
    if (row.status === "present") agg.present += 1;
    else if (row.status === "late") agg.late += 1;
    else if (row.status === "absent") agg.absent += 1;
    else if (row.status === "sick") agg.sick += 1;
    else if (row.status === "personal_leave") agg.personalLeave += 1;
    byStudent.set(row.student_id, agg);
  }

  return studentRows.map((s) => {
    const agg = byStudent.get(s.id) ?? { present: 0, late: 0, absent: 0, sick: 0, personalLeave: 0, total: 0 };
    return {
      student_id: s.id,
      full_name: s.full_name,
      student_code: s.student_code,
      classroom: s.classroom,
      present: agg.present,
      late: agg.late,
      absent: agg.absent,
      sick: agg.sick,
      personalLeave: agg.personalLeave,
      totalDays: agg.total,
      attendanceRatePercent: agg.total > 0 ? Math.round(((agg.present + agg.late) / agg.total) * 100) : 0,
    };
  });
}

// ============================================================================
// Risk detection (rule-based, no external AI calls)
// ============================================================================

export interface RiskStudentRow {
  student_id: string;
  full_name: string;
  student_code: string;
  classroom: string | null;
  risk_level: "low" | "medium" | "high";
  consecutive_absences: number;
  absences_last_30_days: number;
  late_count_last_30_days: number;
  attendance_rate_percent: number;
  reason: string;
}

/**
 * Recomputes risk flags on read (same "derive, then cache" pattern as
 * Module 1/2's AI insights) and upserts the result into
 * `attendance_risk_students` so other readers get a cheap snapshot.
 */
export async function getRiskStudents(): Promise<RiskStudentRow[]> {
  const supabase = await createClient();
  const settings = await getAttendanceSettings();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: students }, { data: attendanceRows }] = await Promise.all([
    supabase.from("students").select("id, full_name, student_code, classroom, school_id").eq("is_active", true).is("deleted_at", null),
    supabase.from("attendance").select("student_id, date, status").gte("date", since).order("date", { ascending: false }),
  ]);

  const studentRows = students ?? [];
  if (studentRows.length === 0) return [];

  const byStudent = new Map<string, { date: string; status: AttendanceStatus }[]>();
  for (const row of attendanceRows ?? []) {
    const list = byStudent.get(row.student_id) ?? [];
    list.push({ date: row.date, status: row.status });
    byStudent.set(row.student_id, list);
  }

  const results: RiskStudentRow[] = [];
  const toUpsert: {
    student_id: string;
    school_id: string;
    risk_level: "low" | "medium" | "high";
    consecutive_absences: number;
    absences_last_30_days: number;
    late_count_last_30_days: number;
    attendance_rate_percent: number;
    reason: string;
  }[] = [];

  for (const s of studentRows) {
    const records = byStudent.get(s.id) ?? [];
    const absences = records.filter((r) => r.status === "absent").length;
    const lates = records.filter((r) => r.status === "late").length;
    const presentish = records.filter((r) => r.status === "present" || r.status === "late").length;
    const attendanceRate = records.length > 0 ? Math.round((presentish / records.length) * 100) : 100;

    let consecutiveAbsences = 0;
    for (const r of records) {
      if (r.status === "absent") consecutiveAbsences += 1;
      else break;
    }

    let riskLevel: "low" | "medium" | "high" = "low";
    let reason = "เข้าเรียนสม่ำเสมอ";

    if (consecutiveAbsences >= settings.risk_consecutive_threshold || absences >= settings.risk_absence_threshold * 2) {
      riskLevel = "high";
      reason = `ขาดเรียนต่อเนื่อง ${consecutiveAbsences} วัน / ขาดเรียน ${absences} วันใน 30 วันล่าสุด`;
    } else if (absences >= settings.risk_absence_threshold) {
      riskLevel = "medium";
      reason = `ขาดเรียน ${absences} วันใน 30 วันล่าสุด ควรติดตาม`;
    } else if (lates >= settings.risk_absence_threshold) {
      riskLevel = "medium";
      reason = `มาสายบ่อย (${lates} ครั้ง) ใน 30 วันล่าสุด`;
    }

    if (riskLevel !== "low") {
      results.push({
        student_id: s.id,
        full_name: s.full_name,
        student_code: s.student_code,
        classroom: s.classroom,
        risk_level: riskLevel,
        consecutive_absences: consecutiveAbsences,
        absences_last_30_days: absences,
        late_count_last_30_days: lates,
        attendance_rate_percent: attendanceRate,
        reason,
      });
    }

    toUpsert.push({
      student_id: s.id,
      school_id: s.school_id,
      risk_level: riskLevel,
      consecutive_absences: consecutiveAbsences,
      absences_last_30_days: absences,
      late_count_last_30_days: lates,
      attendance_rate_percent: attendanceRate,
      reason,
    });
  }

  if (toUpsert.length > 0) {
    await supabase.from("attendance_risk_students").upsert(toUpsert, { onConflict: "student_id" });
  }

  return results.sort((a, b) => (b.risk_level === "high" ? 1 : 0) - (a.risk_level === "high" ? 1 : 0));
}

// ============================================================================
// QR token issuance (wraps src/lib/qr/token.ts + persists to qr_tokens)
// ============================================================================

export async function issueStudentQrToken(studentId: string) {
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("school_id").eq("id", studentId).single();
  if (!student) throw new Error("Student not found");

  const settings = await getAttendanceSettings();
  const { token, payload } = generateQrToken(studentId, settings.qr_token_ttl_seconds);

  await supabase.from("qr_tokens").insert({
    school_id: student.school_id,
    student_id: studentId,
    token,
    payload: token,
    purpose: "attendance",
    expires_at: new Date(payload.expiresAt).toISOString(),
    issued_for_academic_year: payload.academicYear,
  });

  return { token, expiresAt: payload.expiresAt };
}

// ============================================================================
// Check-in (the core QR scan -> attendance write pipeline)
// ============================================================================

export interface CheckinResult {
  success: boolean;
  message: string;
  student?: { id: string; full_name: string; student_code: string; avatar_url: string | null; classroom: string | null };
  status?: AttendanceStatus;
  checkInTime?: string;
}

export async function recordCheckin(
  token: string,
  mode: AttendanceMode = "classroom",
  deviceInfo?: string
): Promise<CheckinResult> {
  const supabase = await createClient();
  const verification = verifyQrToken(token);

  if (!verification.valid) {
    await supabase.from("qr_scan_history").insert({
      school_id: (await currentSchoolId(supabase)) ?? "",
      status: verification.reason === "expired" ? "expired_token" : "invalid_token",
      token_used: token,
      mode,
      device_info: deviceInfo ?? null,
      message: `QR token rejected: ${verification.reason}`,
    });
    return { success: false, message: verification.reason === "expired" ? "QR หมดอายุ กรุณาสร้างใหม่" : "QR ไม่ถูกต้อง" };
  }

  const { studentId } = verification.payload;
  const { data: student } = await supabase
    .from("students")
    .select("id, school_id, full_name, student_code, avatar_url, classroom")
    .eq("id", studentId)
    .single();

  if (!student) {
    await supabase.from("qr_scan_history").insert({
      school_id: (await currentSchoolId(supabase)) ?? "",
      status: "error",
      token_used: token,
      mode,
      device_info: deviceInfo ?? null,
      message: "Student not found",
    });
    return { success: false, message: "ไม่พบข้อมูลนักเรียน" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("student_id", student.id)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    await supabase.from("qr_scan_history").insert({
      school_id: student.school_id,
      student_id: student.id,
      status: "duplicate",
      token_used: token,
      mode,
      device_info: deviceInfo ?? null,
      message: "Already checked in today",
    });
    return {
      success: false,
      message: "เช็คชื่อไปแล้ววันนี้",
      student: { id: student.id, full_name: student.full_name, student_code: student.student_code, avatar_url: student.avatar_url, classroom: student.classroom },
    };
  }

  const settings = await getAttendanceSettings();
  const status = deriveStatus(now, settings);

  const { data: attendanceRow } = await supabase
    .from("attendance")
    .upsert(
      {
        school_id: student.school_id,
        student_id: student.id,
        date: today,
        status,
        check_in_time: now.toISOString(),
        mode,
        method: "qr",
      },
      { onConflict: "student_id,date" }
    )
    .select("id")
    .single();

  await supabase.from("attendance_logs").insert({
    school_id: student.school_id,
    student_id: student.id,
    attendance_id: attendanceRow?.id ?? null,
    source: "qr_token",
    scanned_at: now.toISOString(),
    device_info: deviceInfo ?? null,
    mode,
    result: "success",
  });

  await supabase.from("qr_scan_history").insert({
    school_id: student.school_id,
    student_id: student.id,
    status: "success",
    token_used: token,
    mode,
    device_info: deviceInfo ?? null,
    message: `Checked in as ${status}`,
  });

  // Parent notification — written to the existing `notifications` table only.
  // TODO: integrate LINE OA / SMS push once API credentials are available.
  const { data: parentUsers } = await supabase.from("parents").select("user_id").eq("student_id", student.id);
  if (parentUsers && parentUsers.length > 0) {
    await supabase.from("notifications").insert(
      parentUsers
        .filter((p) => p.user_id)
        .map((p) => ({
          school_id: student.school_id,
          user_id: p.user_id as string,
          title: "ยินดีต้อนรับ - เช็คชื่อสำเร็จ",
          body: `${student.full_name} มาเรียนเรียบร้อยแล้ว เวลา ${now.toLocaleTimeString("th-TH")}`,
          category: "attendance_checkin",
          priority: "low" as const,
        }))
    );
  }

  return {
    success: true,
    message: "เช็คชื่อสำเร็จ",
    student: { id: student.id, full_name: student.full_name, student_code: student.student_code, avatar_url: student.avatar_url, classroom: student.classroom },
    status,
    checkInTime: now.toISOString(),
  };
}

async function currentSchoolId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  return profile?.school_id ?? null;
}

// ============================================================================
// Teacher override
// ============================================================================

export interface AttendanceOverrideChanges {
  status?: AttendanceStatus;
  note?: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
}

export async function overrideAttendance(id: string, changes: AttendanceOverrideChanges): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("attendance")
    .update({
      ...changes,
      approved_by: auth?.user?.id ?? null,
      override_note: changes.note ?? null,
    })
    .eq("id", id);

  if (error) return { success: false, message: error.message };
  return { success: true, message: "บันทึกการแก้ไขสำเร็จ" };
}

export async function bulkOverrideAttendance(
  ids: string[],
  changes: AttendanceOverrideChanges
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("attendance")
    .update({
      ...changes,
      approved_by: auth?.user?.id ?? null,
      override_note: changes.note ?? null,
    })
    .in("id", ids);

  if (error) return { success: false, message: error.message };
  return { success: true, message: `แก้ไขสำเร็จ ${ids.length} รายการ` };
}

// ============================================================================
// Analytics (mode-aware breakdown, complements dashboard.ts's general chart)
// ============================================================================

export interface AttendanceModeBreakdown {
  mode: AttendanceMode;
  count: number;
}

export async function getAttendanceModeAnalytics(): Promise<AttendanceModeBreakdown[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await supabase.from("attendance").select("mode").gte("date", since);

  const counts = new Map<AttendanceMode, number>();
  for (const row of data ?? []) {
    counts.set(row.mode, (counts.get(row.mode) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([mode, count]) => ({ mode, count }));
}
