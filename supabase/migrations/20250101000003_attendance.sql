-- ============================================================================
-- 0003: Attendance - daily attendance, raw scan logs, QR tokens
-- ============================================================================

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  status attendance_status not null default 'absent',
  check_in_time timestamptz,
  check_out_time timestamptz,
  recorded_by uuid references users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, date)
);

-- Raw event log of every scan/check-in attempt (kiosk, QR, manual) — many
-- rows can map to a single `attendance` row for a given day.
create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  attendance_id uuid references attendance(id) on delete cascade,
  source text not null check (source in ('qr_kiosk', 'manual', 'qr_token', 'import')),
  scanned_at timestamptz not null default now(),
  device_info text,
  created_at timestamptz not null default now()
);

-- Short-lived QR tokens shown on /attendance/qr and scanned at /attendance/kiosk.
create table if not exists qr_tokens (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  token text not null unique,
  purpose text not null default 'attendance' check (purpose in ('attendance', 'kiosk_session')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create trigger trg_attendance_updated_at before update on attendance for each row execute function set_updated_at();

create index if not exists idx_attendance_school_date on attendance(school_id, date);
create index if not exists idx_attendance_student on attendance(student_id);
create index if not exists idx_attendance_logs_student on attendance_logs(student_id);
create index if not exists idx_qr_tokens_token on qr_tokens(token);
create index if not exists idx_qr_tokens_expires on qr_tokens(expires_at);
