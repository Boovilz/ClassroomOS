-- ============================================================================
-- 0012: QR Attendance System
--
-- Reuses existing tables instead of introducing parallel ones:
--   - attendance_records   -> existing `attendance` table (ALTERed below)
--   - attendance_rules     -> folded into new `attendance_settings`
--   - attendance_reports   -> generated on-demand in src/lib/queries/attendance.ts,
--                             not stored
--   - attendance_notifications -> reuses existing `notifications` table
--                             (category = 'attendance_checkin')
--
-- What's genuinely new for this module:
--   - qr_scan_history: every scan attempt (success or fail), for security
--     auditing and offline-queue sync reconciliation.
--   - attendance_risk_students: cached rule-based risk flags, recomputed on
--     read by getRiskStudents() (mirrors the Module 1 "skip a history table,
--     store last-computed result" pattern).
--   - attendance_settings: per-school configurable present/late/pending
--     cutoff times, one row per school.
--
-- ALTERs:
--   - attendance gains `mode` (classroom/morning_assembly/subject/lunch/
--     activity/library/event) and `method` (qr/manual/import) so a single
--     table can represent more than one check-in per day in the future
--     without schema churn, plus `approved_by`/`override_note` for the
--     teacher override workflow.
--   - attendance_logs gains `mode` and `result` (success/failed/duplicate)
--     to mirror qr_scan_history's vocabulary for the raw event stream.
--   - qr_tokens gains `payload` (the HMAC-signed JWT-like string) and
--     `issued_for_academic_year` so tokens can be verified without a DB
--     round trip in the common case (verifyQrToken checks the HMAC first).
-- ============================================================================

alter table attendance
  add column if not exists mode text not null default 'classroom'
    check (mode in ('classroom', 'morning_assembly', 'subject', 'lunch', 'activity', 'library', 'event')),
  add column if not exists method text not null default 'manual'
    check (method in ('qr', 'manual', 'import')),
  add column if not exists approved_by uuid references users(id) on delete set null,
  add column if not exists override_note text;

alter table attendance_logs
  add column if not exists mode text not null default 'classroom'
    check (mode in ('classroom', 'morning_assembly', 'subject', 'lunch', 'activity', 'library', 'event')),
  add column if not exists result text not null default 'success'
    check (result in ('success', 'failed', 'duplicate'));

alter table qr_tokens
  add column if not exists payload text,
  add column if not exists issued_for_academic_year int;

-- ---------------------------------------------------------------------------
-- qr_scan_history: every scan attempt (success or fail), independent of
-- whether it produced an attendance row — used for security audit and to
-- reconcile the offline scan queue when a kiosk/scanner reconnects.
-- ---------------------------------------------------------------------------
create table if not exists qr_scan_history (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  scanned_by uuid references users(id) on delete set null,
  token_used text,
  mode text not null default 'classroom'
    check (mode in ('classroom', 'morning_assembly', 'subject', 'lunch', 'activity', 'library', 'event')),
  status text not null check (status in ('success', 'invalid_token', 'expired_token', 'duplicate', 'error')),
  message text,
  device_info text,
  client_scanned_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- attendance_risk_students: cached rule-based risk flags. Recomputed by
-- getRiskStudents() in src/lib/queries/attendance.ts and upserted here so
-- the dashboard panel can read a cheap, stable snapshot.
-- ---------------------------------------------------------------------------
create table if not exists attendance_risk_students (
  student_id uuid primary key references students(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  consecutive_absences int not null default 0,
  absences_last_30_days int not null default 0,
  late_count_last_30_days int not null default 0,
  attendance_rate_percent numeric,
  reason text,
  computed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- attendance_settings: per-school configurable time windows. One row per
-- school; created lazily on first read with sane defaults if missing.
-- ---------------------------------------------------------------------------
create table if not exists attendance_settings (
  school_id uuid primary key references schools(id) on delete cascade,
  present_cutoff_time time not null default '08:30:00',
  late_cutoff_time time not null default '09:00:00',
  pending_cutoff_time time not null default '12:00:00',
  qr_token_ttl_seconds int not null default 300,
  risk_absence_threshold int not null default 3,
  risk_consecutive_threshold int not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_attendance_settings_updated_at before update on attendance_settings for each row execute function set_updated_at();

create index if not exists idx_qr_scan_history_school on qr_scan_history(school_id, created_at);
create index if not exists idx_qr_scan_history_student on qr_scan_history(student_id);
create index if not exists idx_attendance_risk_students_school on attendance_risk_students(school_id, risk_level);
create index if not exists idx_attendance_mode on attendance(mode);

-- ---------------------------------------------------------------------------
-- RLS — same shape as the existing attendance/attendance_logs policies.
-- ---------------------------------------------------------------------------
alter table qr_scan_history enable row level security;
alter table attendance_risk_students enable row level security;
alter table attendance_settings enable row level security;

create policy qr_scan_history_super_admin_all on qr_scan_history for all using (current_role_name() = 'super_admin');
create policy qr_scan_history_admin_manage on qr_scan_history for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy qr_scan_history_teacher_manage on qr_scan_history for all using (
  current_role_name() = 'teacher' and (student_id is null or is_my_student(student_id)) and school_id = current_school_id()
);

create policy attendance_risk_students_super_admin_all on attendance_risk_students for all using (current_role_name() = 'super_admin');
create policy attendance_risk_students_admin_manage on attendance_risk_students for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy attendance_risk_students_teacher_manage on attendance_risk_students for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy attendance_risk_students_parent_select on attendance_risk_students for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy attendance_risk_students_student_select on attendance_risk_students for select using (current_role_name() = 'student' and student_id = current_student_id());

create policy attendance_settings_super_admin_all on attendance_settings for all using (current_role_name() = 'super_admin');
create policy attendance_settings_admin_manage on attendance_settings for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy attendance_settings_school_select on attendance_settings for select using (school_id = current_school_id());
