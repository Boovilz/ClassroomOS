-- ============================================================================
-- 0001: Extensions and shared enum types
-- ============================================================================
create extension if not exists "pgcrypto";

-- Roles for the 5 user personas in the system.
do $$ begin
  create type role as enum ('super_admin', 'school_admin', 'teacher', 'parent', 'student');
exception
  when duplicate_object then null;
end $$;

-- Daily attendance status used by `attendance` and `attendance_logs`.
do $$ begin
  create type attendance_status as enum ('present', 'late', 'sick', 'personal_leave', 'absent');
exception
  when duplicate_object then null;
end $$;

-- Generic helper to auto-update `updated_at` columns on every UPDATE.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
