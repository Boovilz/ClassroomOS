-- ============================================================================
-- 0011: Student Management module
--
-- Reuses existing tables instead of introducing parallel ones:
--   - student_health   -> health_records (no new table)
--   - student_parents  -> parents (extended with income/line_id/address)
--   - student_documents -> documents (free-text `category` already covers
--     "ใบเกิด"/"ทะเบียนบ้าน"/etc.)
--   - student_statistics -> derived live in src/lib/queries/students.ts
--     (mirrors the Module 1 decision to skip a `dashboard_statistics` table)
--   - student_profiles -> folded into `students` via ALTER (citizen_id is
--     reused as the national ID field, not duplicated)
--   - student_risk_profiles -> a single derived `risk_level` column on
--     `students`, no history table
--
-- What's genuinely new for this module:
--   - student_avatars: equip-able cosmetic slots + unlocked items, backing
--     the "XP & Rewards" tab on the student detail page.
--   - students gains an emergency contact block, a large set of
--     profile/socioeconomic fields, risk_level, and is_archived (so
--     "archive" and "delete" are distinct actions in the UI).
--   - parents gains income/line_id/address for the socioeconomic tab.
-- ============================================================================

alter table students
  add column if not exists title text,
  add column if not exists nationality text,
  add column if not exists religion text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists subdistrict text,
  add column if not exists postal_code text,
  add column if not exists phone_number text,
  add column if not exists profile_picture_url text,
  add column if not exists student_number text,
  add column if not exists enrollment_date date,
  add column if not exists graduation_status text,
  add column if not exists learning_support_status text,
  add column if not exists scholarship_status text,
  add column if not exists family_income numeric,
  add column if not exists family_members_count int,
  add column if not exists housing_type text,
  add column if not exists internet_access boolean,
  add column if not exists device_ownership text,
  add column if not exists transportation_method text,
  add column if not exists risk_category text,
  add column if not exists poor_student_program boolean not null default false,
  add column if not exists government_support_programs text,
  add column if not exists risk_level text,
  add column if not exists is_archived boolean not null default false,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists emergency_contact_phone text;

do $$
begin
  alter table students
    add constraint students_risk_level_check check (risk_level in ('low', 'medium', 'high'));
exception
  when duplicate_object then null;
end $$;

alter table parents
  add column if not exists income numeric,
  add column if not exists line_id text,
  add column if not exists address text;

create table if not exists student_avatars (
  student_id uuid primary key references students(id) on delete cascade,
  equipped_hair text,
  equipped_uniform text,
  equipped_accessory text,
  equipped_background text default 'default_bg',
  equipped_frame text,
  unlocked_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_student_avatars_updated_at before update on student_avatars for each row execute function set_updated_at();

create index if not exists idx_students_risk_level on students(risk_level);
create index if not exists idx_students_is_archived on students(is_archived);

alter table student_avatars enable row level security;

-- student_avatars: same scoping shape as the other per-student tables.
create policy student_avatars_super_admin_all on student_avatars for all using (current_role_name() = 'super_admin');
create policy student_avatars_admin_manage on student_avatars for all using (
  current_role_name() = 'school_admin' and exists (select 1 from students s where s.id = student_id and s.school_id = current_school_id())
);
create policy student_avatars_teacher_manage on student_avatars for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy student_avatars_parent_select on student_avatars for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy student_avatars_student_select on student_avatars for select using (current_role_name() = 'student' and student_id = current_student_id());
