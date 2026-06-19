-- ============================================================================
-- 0010: Dashboard module
--
-- Most dashboard numbers (summary cards, analytics charts, the leaderboard)
-- are aggregated on the fly from existing tables (students, attendance,
-- behavior_records, scores, finance_transactions, health_records) — they
-- are not duplicated into new "statistics" tables to avoid a second source
-- of truth that can drift out of sync.
--
-- What's genuinely new for this module:
--   - calendar_events: backs the dashboard calendar widget (exams, school
--     activities, parent meetings, field trips, holidays).
--   - dashboard_activities: a lightweight "recent activity" feed, separate
--     from the compliance-oriented `audit_logs` table.
--   - dashboard_ai_insights: cached AI-generated insights/recommendations.
--   - notifications gains `priority`/`category` so the notification center
--     can show severity levels (low/medium/high/critical) without a second
--     notifications table.
-- ============================================================================

alter table notifications
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  add column if not exists category text;

alter table finance_accounts drop constraint if exists finance_accounts_account_type_check;
alter table finance_accounts add constraint finance_accounts_account_type_check
  check (account_type in ('classroom_fund', 'school_fund', 'lunch_fund', 'savings', 'other'));

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  title text not null,
  description text,
  event_type text not null default 'activity'
    check (event_type in ('exam', 'activity', 'parent_meeting', 'field_trip', 'holiday')),
  classroom text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dashboard_activities (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  student_id uuid references students(id) on delete cascade,
  activity_type text not null
    check (activity_type in ('attendance', 'xp_award', 'behavior', 'health', 'finance', 'communication', 'academic')),
  description text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists dashboard_ai_insights (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  teacher_id uuid references teachers(id) on delete cascade,
  insight_type text not null
    check (insight_type in ('attendance_risk', 'academic_risk', 'behavior_trend', 'health_concern', 'intervention')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  student_id uuid references students(id) on delete cascade,
  title text not null,
  recommendation text not null,
  dismissed_at timestamptz,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create trigger trg_calendar_events_updated_at before update on calendar_events for each row execute function set_updated_at();

create index if not exists idx_calendar_events_school on calendar_events(school_id, starts_at);
create index if not exists idx_dashboard_activities_school on dashboard_activities(school_id, occurred_at desc);
create index if not exists idx_dashboard_activities_student on dashboard_activities(student_id);
create index if not exists idx_dashboard_ai_insights_teacher on dashboard_ai_insights(teacher_id);

alter table calendar_events enable row level security;
alter table dashboard_activities enable row level security;
alter table dashboard_ai_insights enable row level security;

-- calendar_events: visible to everyone in the school; managed by admin/teacher
create policy calendar_events_super_admin_all on calendar_events for all using (current_role_name() = 'super_admin');
create policy calendar_events_school_select on calendar_events for select using (school_id = current_school_id());
create policy calendar_events_admin_teacher_manage on calendar_events for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

-- dashboard_activities: admin sees school-wide, teacher sees their own students'
create policy dashboard_activities_super_admin_all on dashboard_activities for all using (current_role_name() = 'super_admin');
create policy dashboard_activities_admin_manage on dashboard_activities for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy dashboard_activities_teacher_manage on dashboard_activities for all using (
  current_role_name() = 'teacher' and school_id = current_school_id() and (student_id is null or is_my_student(student_id))
);

-- dashboard_ai_insights: admin sees school-wide, teacher sees only their own
create policy dashboard_ai_insights_super_admin_all on dashboard_ai_insights for all using (current_role_name() = 'super_admin');
create policy dashboard_ai_insights_admin_manage on dashboard_ai_insights for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy dashboard_ai_insights_teacher_manage on dashboard_ai_insights for all using (
  current_role_name() = 'teacher' and school_id = current_school_id() and teacher_id = current_teacher_id()
);
