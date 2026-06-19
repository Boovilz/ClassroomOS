-- ============================================================================
-- 0009: Row Level Security
--
-- RBAC model:
--   super_admin  -> sees everything, everywhere.
--   school_admin -> sees all rows scoped to their own school_id.
--   teacher      -> sees rows for students in their own classroom
--                   (students.teacher_id = their teachers.id), plus their
--                   own school's shared/reference data (subjects, etc).
--   parent       -> sees only rows belonging to their own child/children
--                   (parents.user_id = auth.uid(), scoped via student_id).
--   student      -> sees only their own rows (students.user_id = auth.uid()).
--
-- Helper functions below read auth.uid() so they can be reused across many
-- policies without repeating subqueries everywhere.
-- ============================================================================

-- Returns the calling user's row from `users`, or null if not signed in.
create or replace function current_app_user()
returns users as $$
  select * from users where id = auth.uid();
$$ language sql stable security definer;

create or replace function current_role_name()
returns role as $$
  select role from users where id = auth.uid();
$$ language sql stable security definer;

create or replace function current_school_id()
returns uuid as $$
  select school_id from users where id = auth.uid();
$$ language sql stable security definer;

-- The student.id the current user "is" (for role = student).
create or replace function current_student_id()
returns uuid as $$
  select id from students where user_id = auth.uid();
$$ language sql stable security definer;

-- The teacher.id the current user "is" (for role = teacher).
create or replace function current_teacher_id()
returns uuid as $$
  select id from teachers where user_id = auth.uid();
$$ language sql stable security definer;

-- True if `target_student_id` is a child of the current parent user.
create or replace function is_my_child(target_student_id uuid)
returns boolean as $$
  select exists (
    select 1 from parents
    where parents.user_id = auth.uid()
      and parents.student_id = target_student_id
  );
$$ language sql stable security definer;

-- True if `target_student_id` is taught by the current teacher.
create or replace function is_my_student(target_student_id uuid)
returns boolean as $$
  select exists (
    select 1 from students
    where students.id = target_student_id
      and students.teacher_id = current_teacher_id()
  );
$$ language sql stable security definer;

-- Enable RLS on every domain table.
alter table schools enable row level security;
alter table users enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table parents enable row level security;
alter table attendance enable row level security;
alter table attendance_logs enable row level security;
alter table qr_tokens enable row level security;
alter table behavior_records enable row level security;
alter table xp_transactions enable row level security;
alter table coin_transactions enable row level security;
alter table achievements enable row level security;
alter table student_achievements enable row level security;
alter table leaderboards enable row level security;
alter table reward_shop_items enable row level security;
alter table subjects enable row level security;
alter table scores enable row level security;
alter table assignments enable row level security;
alter table health_records enable row level security;
alter table vaccinations enable row level security;
alter table finance_accounts enable row level security;
alter table finance_transactions enable row level security;
alter table meal_records enable row level security;
alter table home_visits enable row level security;
alter table sdq_assessments enable row level security;
alter table documents enable row level security;
alter table announcements enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- schools
-- ---------------------------------------------------------------------------
create policy schools_super_admin_all on schools for all
  using (current_role_name() = 'super_admin');

create policy schools_member_select on schools for select
  using (id = current_school_id());

create policy schools_admin_update on schools for update
  using (current_role_name() = 'school_admin' and id = current_school_id());

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create policy users_super_admin_all on users for all
  using (current_role_name() = 'super_admin');

create policy users_self_select on users for select
  using (id = auth.uid());

create policy users_school_admin_select on users for select
  using (current_role_name() = 'school_admin' and school_id = current_school_id());

create policy users_self_update on users for update
  using (id = auth.uid());

create policy users_school_admin_manage on users for all
  using (current_role_name() = 'school_admin' and school_id = current_school_id());

-- ---------------------------------------------------------------------------
-- teachers
-- ---------------------------------------------------------------------------
create policy teachers_super_admin_all on teachers for all
  using (current_role_name() = 'super_admin');

create policy teachers_school_scope on teachers for select
  using (school_id = current_school_id());

create policy teachers_admin_manage on teachers for all
  using (current_role_name() = 'school_admin' and school_id = current_school_id());

create policy teachers_self_select on teachers for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
create policy students_super_admin_all on students for all
  using (current_role_name() = 'super_admin');

create policy students_admin_manage on students for all
  using (current_role_name() = 'school_admin' and school_id = current_school_id());

create policy students_teacher_select on students for select
  using (current_role_name() = 'teacher' and teacher_id = current_teacher_id());

create policy students_teacher_update on students for update
  using (current_role_name() = 'teacher' and teacher_id = current_teacher_id());

create policy students_parent_select on students for select
  using (current_role_name() = 'parent' and is_my_child(id));

create policy students_self_select on students for select
  using (current_role_name() = 'student' and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- parents
-- ---------------------------------------------------------------------------
create policy parents_super_admin_all on parents for all
  using (current_role_name() = 'super_admin');

create policy parents_admin_manage on parents for all
  using (current_role_name() = 'school_admin' and school_id = current_school_id());

create policy parents_teacher_select on parents for select
  using (current_role_name() = 'teacher' and is_my_student(student_id));

create policy parents_self_select on parents for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Generic per-student-scoped tables: attendance, attendance_logs,
-- behavior_records, xp_transactions, coin_transactions, scores,
-- health_records, vaccinations, finance_transactions (via student_id),
-- meal_records, home_visits, sdq_assessments, documents.
-- All follow the same shape: super_admin all; school_admin scoped to
-- school_id; teacher scoped to is_my_student(student_id); parent scoped to
-- is_my_child(student_id); student scoped to their own student_id.
-- ---------------------------------------------------------------------------

-- attendance
create policy attendance_super_admin_all on attendance for all using (current_role_name() = 'super_admin');
create policy attendance_admin_manage on attendance for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy attendance_teacher_manage on attendance for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy attendance_parent_select on attendance for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy attendance_student_select on attendance for select using (current_role_name() = 'student' and student_id = current_student_id());

-- attendance_logs
create policy attendance_logs_super_admin_all on attendance_logs for all using (current_role_name() = 'super_admin');
create policy attendance_logs_admin_manage on attendance_logs for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy attendance_logs_teacher_manage on attendance_logs for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy attendance_logs_parent_select on attendance_logs for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy attendance_logs_student_select on attendance_logs for select using (current_role_name() = 'student' and student_id = current_student_id());

-- qr_tokens (teachers/admins generate; students/kiosk consume via service role typically)
create policy qr_tokens_super_admin_all on qr_tokens for all using (current_role_name() = 'super_admin');
create policy qr_tokens_admin_manage on qr_tokens for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy qr_tokens_teacher_manage on qr_tokens for all using (current_role_name() = 'teacher' and school_id = current_school_id());
create policy qr_tokens_student_select on qr_tokens for select using (current_role_name() = 'student' and student_id = current_student_id());

-- behavior_records
create policy behavior_records_super_admin_all on behavior_records for all using (current_role_name() = 'super_admin');
create policy behavior_records_admin_manage on behavior_records for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy behavior_records_teacher_manage on behavior_records for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy behavior_records_parent_select on behavior_records for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy behavior_records_student_select on behavior_records for select using (current_role_name() = 'student' and student_id = current_student_id());

-- xp_transactions
create policy xp_transactions_super_admin_all on xp_transactions for all using (current_role_name() = 'super_admin');
create policy xp_transactions_admin_manage on xp_transactions for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy xp_transactions_teacher_manage on xp_transactions for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy xp_transactions_parent_select on xp_transactions for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy xp_transactions_student_select on xp_transactions for select using (current_role_name() = 'student' and student_id = current_student_id());

-- coin_transactions
create policy coin_transactions_super_admin_all on coin_transactions for all using (current_role_name() = 'super_admin');
create policy coin_transactions_admin_manage on coin_transactions for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy coin_transactions_teacher_manage on coin_transactions for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy coin_transactions_parent_select on coin_transactions for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy coin_transactions_student_manage on coin_transactions for all using (current_role_name() = 'student' and student_id = current_student_id());

-- achievements (reference data, readable by all members of the school or global)
create policy achievements_super_admin_all on achievements for all using (current_role_name() = 'super_admin');
create policy achievements_select on achievements for select using (school_id is null or school_id = current_school_id());
create policy achievements_admin_manage on achievements for all using (current_role_name() = 'school_admin' and school_id = current_school_id());

-- student_achievements
create policy student_achievements_super_admin_all on student_achievements for all using (current_role_name() = 'super_admin');
create policy student_achievements_admin_manage on student_achievements for all using (
  current_role_name() = 'school_admin' and exists (select 1 from students s where s.id = student_id and s.school_id = current_school_id())
);
create policy student_achievements_teacher_select on student_achievements for select using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy student_achievements_parent_select on student_achievements for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy student_achievements_student_select on student_achievements for select using (current_role_name() = 'student' and student_id = current_student_id());

-- leaderboards (school-wide visibility for all members; gamification is meant to be seen)
create policy leaderboards_super_admin_all on leaderboards for all using (current_role_name() = 'super_admin');
create policy leaderboards_school_select on leaderboards for select using (school_id = current_school_id());
create policy leaderboards_admin_manage on leaderboards for all using (current_role_name() = 'school_admin' and school_id = current_school_id());

-- reward_shop_items (school-wide visibility; admins/teachers manage)
create policy reward_shop_items_super_admin_all on reward_shop_items for all using (current_role_name() = 'super_admin');
create policy reward_shop_items_school_select on reward_shop_items for select using (school_id = current_school_id());
create policy reward_shop_items_admin_manage on reward_shop_items for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

-- subjects / assignments (school-wide reference data)
create policy subjects_super_admin_all on subjects for all using (current_role_name() = 'super_admin');
create policy subjects_school_select on subjects for select using (school_id = current_school_id());
create policy subjects_admin_teacher_manage on subjects for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

create policy assignments_super_admin_all on assignments for all using (current_role_name() = 'super_admin');
create policy assignments_school_select on assignments for select using (school_id = current_school_id());
create policy assignments_admin_teacher_manage on assignments for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

-- scores
create policy scores_super_admin_all on scores for all using (current_role_name() = 'super_admin');
create policy scores_admin_manage on scores for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy scores_teacher_manage on scores for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy scores_parent_select on scores for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy scores_student_select on scores for select using (current_role_name() = 'student' and student_id = current_student_id());

-- health_records
create policy health_records_super_admin_all on health_records for all using (current_role_name() = 'super_admin');
create policy health_records_admin_manage on health_records for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy health_records_teacher_manage on health_records for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy health_records_parent_select on health_records for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy health_records_student_select on health_records for select using (current_role_name() = 'student' and student_id = current_student_id());

-- vaccinations
create policy vaccinations_super_admin_all on vaccinations for all using (current_role_name() = 'super_admin');
create policy vaccinations_admin_manage on vaccinations for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy vaccinations_teacher_manage on vaccinations for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy vaccinations_parent_select on vaccinations for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy vaccinations_student_select on vaccinations for select using (current_role_name() = 'student' and student_id = current_student_id());

-- finance_accounts (admin/teacher managed; parents/students not given access by default)
create policy finance_accounts_super_admin_all on finance_accounts for all using (current_role_name() = 'super_admin');
create policy finance_accounts_admin_teacher_manage on finance_accounts for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

-- finance_transactions
create policy finance_transactions_super_admin_all on finance_transactions for all using (current_role_name() = 'super_admin');
create policy finance_transactions_admin_teacher_manage on finance_transactions for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());
create policy finance_transactions_parent_select on finance_transactions for select using (current_role_name() = 'parent' and student_id is not null and is_my_child(student_id));
create policy finance_transactions_student_select on finance_transactions for select using (current_role_name() = 'student' and student_id = current_student_id());

-- meal_records
create policy meal_records_super_admin_all on meal_records for all using (current_role_name() = 'super_admin');
create policy meal_records_admin_teacher_manage on meal_records for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());
create policy meal_records_parent_select on meal_records for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy meal_records_student_select on meal_records for select using (current_role_name() = 'student' and student_id = current_student_id());

-- home_visits (teacher/admin only — sensitive)
create policy home_visits_super_admin_all on home_visits for all using (current_role_name() = 'super_admin');
create policy home_visits_admin_manage on home_visits for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy home_visits_teacher_manage on home_visits for all using (current_role_name() = 'teacher' and is_my_student(student_id));

-- sdq_assessments (teacher/admin only — sensitive)
create policy sdq_assessments_super_admin_all on sdq_assessments for all using (current_role_name() = 'super_admin');
create policy sdq_assessments_admin_manage on sdq_assessments for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy sdq_assessments_teacher_manage on sdq_assessments for all using (current_role_name() = 'teacher' and is_my_student(student_id));

-- documents
create policy documents_super_admin_all on documents for all using (current_role_name() = 'super_admin');
create policy documents_admin_manage on documents for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy documents_teacher_manage on documents for all using (current_role_name() = 'teacher' and (student_id is null or is_my_student(student_id)) and school_id = current_school_id());
create policy documents_parent_select on documents for select using (current_role_name() = 'parent' and student_id is not null and is_my_child(student_id));
create policy documents_student_select on documents for select using (current_role_name() = 'student' and student_id = current_student_id());

-- announcements (broadcast within a school; visible to all roles in that school)
create policy announcements_super_admin_all on announcements for all using (current_role_name() = 'super_admin');
create policy announcements_school_select on announcements for select using (school_id = current_school_id());
create policy announcements_admin_teacher_manage on announcements for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

-- notifications (strictly per-user)
create policy notifications_super_admin_all on notifications for all using (current_role_name() = 'super_admin');
create policy notifications_self_select on notifications for select using (user_id = auth.uid());
create policy notifications_self_update on notifications for update using (user_id = auth.uid());
create policy notifications_admin_insert on notifications for insert with check (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

-- audit_logs (read-only for admins, write via service role / app server actions)
create policy audit_logs_super_admin_all on audit_logs for all using (current_role_name() = 'super_admin');
create policy audit_logs_admin_select on audit_logs for select using (current_role_name() = 'school_admin' and school_id = current_school_id());
