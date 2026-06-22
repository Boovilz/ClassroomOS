-- ============================================================================
-- 0023: Gap-closing pass - soft-delete on SSOT tables + audit_logs wiring
--
-- Scope (per the "gap-closing pass" decision, NOT a from-scratch redesign):
--   1. Soft-delete (`deleted_at`) on the core SSOT tables only: schools,
--      users, teachers, students, parents. `classrooms` does not exist as a
--      real table (Module 2/11 model classroom as a free-text column on
--      `students`), and `student_parents` does not exist either (`parents`
--      already carries a direct `student_id` FK from migration 0002) - both
--      are skipped per the task's own escape clause.
--   2. `audit_logs` already exists (see 20250101000008_tier3_modules.sql,
--      enabled for RLS in 20250101000009_rls_policies.sql). It is NOT
--      recreated here. Its existing columns (`entity_table`, `metadata`)
--      are reused as-is by the app-level logging helper; no schema changes
--      are needed for the 3 high-value logging call sites wired up in this
--      pass (student CRUD, login, finance withdrawal approval).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Soft-delete columns
-- ----------------------------------------------------------------------------
alter table schools add column if not exists deleted_at timestamptz;
alter table users add column if not exists deleted_at timestamptz;
alter table teachers add column if not exists deleted_at timestamptz;
alter table students add column if not exists deleted_at timestamptz;
alter table parents add column if not exists deleted_at timestamptz;

create index if not exists idx_schools_deleted_at on schools(deleted_at) where deleted_at is not null;
create index if not exists idx_users_deleted_at on users(deleted_at) where deleted_at is not null;
create index if not exists idx_teachers_deleted_at on teachers(deleted_at) where deleted_at is not null;
create index if not exists idx_students_deleted_at on students(deleted_at) where deleted_at is not null;
create index if not exists idx_parents_deleted_at on parents(deleted_at) where deleted_at is not null;

-- ----------------------------------------------------------------------------
-- 2. RLS: filter out soft-deleted rows for non-admin roles. super_admin and
--    school_admin policies are left untouched (they use `for all` / are the
--    ones responsible for restoring soft-deleted rows, so they must still
--    see them). Only the narrower select/update policies used by teacher/
--    parent/student/self roles gain the `deleted_at is null` guard.
-- ----------------------------------------------------------------------------

-- schools: schools_member_select is used by every non-admin role to read
-- their own school; schools_admin_update is school_admin-only (unaffected).
drop policy if exists schools_member_select on schools;
create policy schools_member_select on schools for select
  using (id = current_school_id() and deleted_at is null);

-- users: users_self_select / users_self_update let every role read/update
-- their own row regardless of admin status, so we guard those (a
-- soft-deleted user account should not be able to read/update itself).
-- users_school_admin_select stays unguarded so admins can see deleted users
-- to restore them.
drop policy if exists users_self_select on users;
create policy users_self_select on users for select
  using (id = auth.uid() and deleted_at is null);

drop policy if exists users_self_update on users;
create policy users_self_update on users for update
  using (id = auth.uid() and deleted_at is null);

-- teachers: teachers_school_scope / teachers_self_select are the
-- non-admin-facing read paths.
drop policy if exists teachers_school_scope on teachers;
create policy teachers_school_scope on teachers for select
  using (school_id = current_school_id() and deleted_at is null);

drop policy if exists teachers_self_select on teachers;
create policy teachers_self_select on teachers for select
  using (user_id = auth.uid() and deleted_at is null);

-- students: teacher/parent/student-facing select & update policies.
-- students_admin_manage (school_admin, `for all`) is left untouched so
-- admins can see/restore soft-deleted students.
drop policy if exists students_teacher_select on students;
create policy students_teacher_select on students for select
  using (current_role_name() = 'teacher' and teacher_id = current_teacher_id() and deleted_at is null);

drop policy if exists students_teacher_update on students;
create policy students_teacher_update on students for update
  using (current_role_name() = 'teacher' and teacher_id = current_teacher_id() and deleted_at is null);

drop policy if exists students_parent_select on students;
create policy students_parent_select on students for select
  using (current_role_name() = 'parent' and is_my_child(id) and deleted_at is null);

drop policy if exists students_self_select on students;
create policy students_self_select on students for select
  using (current_role_name() = 'student' and user_id = auth.uid() and deleted_at is null);

-- parents: teacher/self-facing select policies. parents_admin_manage
-- (school_admin, `for all`) is left untouched.
drop policy if exists parents_teacher_select on parents;
create policy parents_teacher_select on parents for select
  using (current_role_name() = 'teacher' and is_my_student(student_id) and deleted_at is null);

drop policy if exists parents_self_select on parents;
create policy parents_self_select on parents for select
  using (user_id = auth.uid() and deleted_at is null);

-- ----------------------------------------------------------------------------
-- 3. audit_logs: allow any authenticated user to insert a log row scoped to
--    their own school_id. Existing policies (audit_logs_super_admin_all,
--    audit_logs_admin_select from 20250101000009_rls_policies.sql) already
--    cover read access; audit logs are otherwise immutable (no update/delete
--    policy is added for non-super-admins).
-- ----------------------------------------------------------------------------
drop policy if exists audit_logs_insert on audit_logs;
create policy audit_logs_insert on audit_logs for insert
  with check (school_id = current_school_id());
