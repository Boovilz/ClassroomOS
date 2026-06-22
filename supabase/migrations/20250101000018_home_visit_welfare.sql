-- ============================================================================
-- 0018: Module 9 - Home Visit & Student Welfare System
--
-- Reuses (does NOT duplicate):
--   - students (0002/0011): full_name/student_code/classroom/grade/address/
--     phone_number/emergency_contact_*/family_income/family_members_count/
--     housing_type/internet_access/device_ownership/transportation_method/
--     risk_category/risk_level/poor_student_program/government_support_programs/
--     scholarship_status already cover most of "Household Information" /
--     "Poor Student Screening" / "Student Risk Assessment" header fields.
--     Extended in place (below) only with the handful of genuinely missing
--     columns (poverty_risk_score, last_home_visit_at, welfare fields).
--   - parents (0002/0011): full_name/relationship/occupation/phone/income/
--     address already cover "Family Members" for primary contacts. Extended
--     with a couple of household-specific fields rather than duplicated.
--   - home_visits (0008): the existing visit record. Extended in place with
--     scheduling/visit-type/GPS/outcome/duration columns instead of a new
--     home_visit_schedules table - a single table with a `status` column
--     covers both "scheduled appointment" and "completed visit" rows, which
--     is also how calendar_events (0010) treats event lifecycle.
--   - documents (0008): reused as-is for home-visit document management
--     (income verification, house registration, consent forms, case notes)
--     via category discriminator + a new optional home_visit_id link,
--     instead of a parallel home_visit_documents table.
--   - notifications (0008): reused as-is for home-visit reminders
--     (link points at /home-visits/{id}), instead of a parallel reminders
--     table.
--   - meal_eligibility (0017, Module 8): reused as-is for the
--     "school lunch support" assistance program; assistance_programs/
--     student_assistance below cover the *other* programs (scholarship,
--     educational grant, emergency assistance, uniform, learning materials)
--     so there is exactly one home for each program type, no overlap.
--   - attendance_risk_students (Module 3) + getStudentAcademicSummary
--     (Module 5, academic.ts) are read directly by getAiRiskScore() in
--     src/lib/queries/welfare.ts as INPUTS to the composite risk score -
--     attendance-rate and GPA are never recomputed from scratch here.
--   - students.risk_level / students.risk_category (0011): kept as THE
--     single source of truth for "current risk", same as the existing
--     "student_risk_profiles -> single derived column, no history table"
--     decision documented in 0011. getAiRiskScore() updates these columns
--     in place; there is no new risk_assessments history table.
--
-- New tables (genuinely new concepts):
--   home_visit_photos      - photo gallery for a visit (house/study/family).
--   household_profiles     - 1:1 per-student living-conditions assessment
--                             (housing quality, sanitation, safety, etc.)
--                             that doesn't fit as flat columns on `students`.
--   family_members          - household roster (relationship/occupation/
--                             income/education) beyond the primary parents
--                             rows, for "Family Members" within a household.
--   assistance_programs     - catalog of scholarship/grant/emergency/
--                             uniform/learning-material programs.
--   student_assistance      - junction: which student is enrolled/eligible
--                             in which assistance_programs row.
--   intervention_plans      - support/improvement plans + follow-up tracking.
--   student_cases           - case management (concerns/actions/status).
--   parent_communications   - meetings/calls/LINE messages/agreements log.
--
-- Deliberately SKIPPED per scoping philosophy:
--   - home_visit_schedules -> home_visits extended in place (status column).
--   - student_welfare_profiles -> merged into household_profiles + the
--     existing students.risk_level/risk_category/poor_student_program
--     fields; a third overlapping table would duplicate both.
--   - risk_assessments (history table) -> students.risk_level/risk_category
--     are the single derived snapshot, consistent with 0011's decision.
--   - home_visit_reports -> computed on-demand in welfare.ts from
--     home_visits + household_profiles + risk fields, never stored.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extend students: only the handful of fields not already covered by 0011.
-- ----------------------------------------------------------------------------
alter table students add column if not exists poverty_risk_score int;
alter table students add column if not exists last_home_visit_at date;
alter table students add column if not exists welfare_status text;
do $$ begin
  alter table students add constraint students_welfare_status_check
    check (welfare_status in ('normal', 'monitoring', 'needs_support', 'critical'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_students_welfare_status on students(welfare_status);
create index if not exists idx_students_poverty_risk_score on students(poverty_risk_score);

-- ----------------------------------------------------------------------------
-- Extend parents: household-roster relevant fields not already present.
-- ----------------------------------------------------------------------------
alter table parents add column if not exists education_level text;

-- ----------------------------------------------------------------------------
-- Extend home_visits: scheduling, visit type, GPS, outcome, duration.
-- ----------------------------------------------------------------------------
alter table home_visits add column if not exists visit_time time;
alter table home_visits add column if not exists visit_type text not null default 'routine';
do $$ begin
  alter table home_visits add constraint home_visits_visit_type_check
    check (visit_type in ('routine', 'follow_up', 'emergency', 'poverty_screening', 'welfare_check'));
exception when duplicate_object then null;
end $$;
alter table home_visits add column if not exists purpose text;
alter table home_visits add column if not exists outcome text;
alter table home_visits add column if not exists duration_minutes int;
alter table home_visits add column if not exists status text not null default 'scheduled';
do $$ begin
  alter table home_visits add constraint home_visits_status_check
    check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled'));
exception when duplicate_object then null;
end $$;
alter table home_visits add column if not exists latitude numeric;
alter table home_visits add column if not exists longitude numeric;
alter table home_visits add column if not exists maps_url text;
alter table home_visits add column if not exists economic_status text;
alter table home_visits add column if not exists educational_support text;
alter table home_visits add column if not exists family_support text;
alter table home_visits add column if not exists health_status_note text;
alter table home_visits add column if not exists behavior_concerns text;
alter table home_visits add column if not exists attendance_concerns text;
alter table home_visits add column if not exists academic_concerns text;
alter table home_visits add column if not exists created_by uuid references users(id) on delete set null;

create index if not exists idx_home_visits_visit_date on home_visits(visit_date);
create index if not exists idx_home_visits_status on home_visits(status);
create index if not exists idx_home_visits_school_date on home_visits(school_id, visit_date);

-- Link documents to a specific home visit (optional - documents already
-- link to a student; this adds the visit-level grouping).
alter table documents add column if not exists home_visit_id uuid;
do $$ begin
  alter table documents add constraint documents_home_visit_id_fkey
    foreign key (home_visit_id) references home_visits(id) on delete set null;
exception when duplicate_object then null;
end $$;
create index if not exists idx_documents_home_visit on documents(home_visit_id);

-- ----------------------------------------------------------------------------
-- home_visit_photos: house / study-area / family photo gallery for a visit.
-- ----------------------------------------------------------------------------
create table if not exists home_visit_photos (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  home_visit_id uuid not null references home_visits(id) on delete cascade,
  photo_url text not null,
  category text not null default 'house' check (category in ('house', 'study_area', 'family', 'other')),
  caption text,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_home_visit_photos_visit on home_visit_photos(home_visit_id);

-- ----------------------------------------------------------------------------
-- household_profiles: 1:1 per-student living-conditions assessment.
-- ----------------------------------------------------------------------------
create table if not exists household_profiles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  housing_ownership text check (housing_ownership in ('owned', 'rented', 'relative_owned', 'temporary', 'homeless')),
  utilities_access boolean,
  housing_quality text check (housing_quality in ('excellent', 'good', 'fair', 'needs_support')),
  sleeping_arrangement text check (sleeping_arrangement in ('excellent', 'good', 'fair', 'needs_support')),
  study_environment text check (study_environment in ('excellent', 'good', 'fair', 'needs_support')),
  electricity_water_access text check (electricity_water_access in ('excellent', 'good', 'fair', 'needs_support')),
  sanitation_condition text check (sanitation_condition in ('excellent', 'good', 'fair', 'needs_support')),
  safety_condition text check (safety_condition in ('excellent', 'good', 'fair', 'needs_support')),
  family_size int,
  household_assets text,
  government_assistance_received text,
  assessed_by uuid references users(id) on delete set null,
  assessed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id)
);

create trigger trg_household_profiles_updated_at before update on household_profiles for each row execute function set_updated_at();
create index if not exists idx_household_profiles_student on household_profiles(student_id);

-- ----------------------------------------------------------------------------
-- family_members: household roster beyond the primary `parents` rows.
-- ----------------------------------------------------------------------------
create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  full_name text not null,
  relationship text not null,
  occupation text,
  monthly_income numeric,
  education_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_family_members_updated_at before update on family_members for each row execute function set_updated_at();
create index if not exists idx_family_members_student on family_members(student_id);

-- ----------------------------------------------------------------------------
-- assistance_programs: catalog (scholarship / lunch / grant / emergency /
-- uniform / learning materials). School lunch support stays in
-- meal_eligibility (0017) - not duplicated here.
-- ----------------------------------------------------------------------------
create table if not exists assistance_programs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  program_type text not null check (program_type in (
    'scholarship', 'educational_grant', 'emergency_assistance', 'uniform_support', 'learning_materials'
  )),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_assistance_programs_updated_at before update on assistance_programs for each row execute function set_updated_at();
create index if not exists idx_assistance_programs_school on assistance_programs(school_id);

-- ----------------------------------------------------------------------------
-- student_assistance: junction - eligibility/enrollment per student.
-- ----------------------------------------------------------------------------
create table if not exists student_assistance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid not null references assistance_programs(id) on delete cascade,
  status text not null default 'pending_review' check (status in ('eligible', 'not_eligible', 'pending_review', 'enrolled')),
  amount numeric,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, program_id)
);

create trigger trg_student_assistance_updated_at before update on student_assistance for each row execute function set_updated_at();
create index if not exists idx_student_assistance_student on student_assistance(student_id);
create index if not exists idx_student_assistance_program on student_assistance(program_id);
create index if not exists idx_student_assistance_status on student_assistance(status);

-- ----------------------------------------------------------------------------
-- intervention_plans: support/improvement plans + follow-up tracking.
-- ----------------------------------------------------------------------------
create table if not exists intervention_plans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  case_id uuid,
  plan_type text not null default 'support_plan' check (plan_type in ('support_plan', 'improvement_plan', 'follow_up_action')),
  title text not null,
  description text,
  responsible_staff uuid references users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  start_date date not null default current_date,
  target_completion_date date,
  completed_at timestamptz,
  progress_notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_intervention_plans_updated_at before update on intervention_plans for each row execute function set_updated_at();
create index if not exists idx_intervention_plans_student on intervention_plans(student_id);
create index if not exists idx_intervention_plans_status on intervention_plans(status);

-- ----------------------------------------------------------------------------
-- student_cases: case management (concerns/actions/status/meetings).
-- ----------------------------------------------------------------------------
create table if not exists student_cases (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  title text not null,
  concern_type text not null default 'welfare' check (concern_type in ('welfare', 'academic', 'behavior', 'attendance', 'health', 'family')),
  description text,
  status text not null default 'open' check (status in ('open', 'monitoring', 'resolved', 'closed')),
  opened_by uuid references users(id) on delete set null,
  assigned_to uuid references users(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_student_cases_updated_at before update on student_cases for each row execute function set_updated_at();
create index if not exists idx_student_cases_student on student_cases(student_id);
create index if not exists idx_student_cases_status on student_cases(status);

alter table intervention_plans add constraint intervention_plans_case_id_fkey
  foreign key (case_id) references student_cases(id) on delete set null;

-- ----------------------------------------------------------------------------
-- parent_communications: meetings/calls/LINE messages/agreements log.
-- ----------------------------------------------------------------------------
create table if not exists parent_communications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  case_id uuid references student_cases(id) on delete set null,
  home_visit_id uuid references home_visits(id) on delete set null,
  communication_type text not null default 'phone_call' check (communication_type in (
    'meeting', 'phone_call', 'line_message', 'home_visit_discussion', 'agreement'
  )),
  summary text not null,
  agreements text,
  follow_up_action text,
  follow_up_date date,
  communicated_by uuid references users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_parent_communications_student on parent_communications(student_id);
create index if not exists idx_parent_communications_case on parent_communications(case_id);

-- ============================================================================
-- Row Level Security
--
-- Access decision: home visit + welfare data (home_visits, photos,
-- household_profiles, family_members, intervention_plans, student_cases,
-- parent_communications) is sensitive case-management/welfare data, not a
-- parent-portal feature like Modules 6-8. Only super_admin/school_admin/
-- teacher (of their own students) can read or write it - there are
-- deliberately NO parent_select / student_select policies on any of these
-- tables. assistance_programs (catalog) is admin/teacher visible only, since
-- the related meal_eligibility precedent (0017) already keeps eligibility
-- staff-managed with parent/student read of THEIR OWN row only; here we
-- withhold that read too because eligibility for scholarship/emergency aid
-- is considered sensitive welfare information, matching the human spec note
-- that this module is staff-only.
-- ============================================================================
alter table home_visit_photos enable row level security;
alter table household_profiles enable row level security;
alter table family_members enable row level security;
alter table assistance_programs enable row level security;
alter table student_assistance enable row level security;
alter table intervention_plans enable row level security;
alter table student_cases enable row level security;
alter table parent_communications enable row level security;

-- home_visit_photos
do $$ begin
  create policy home_visit_photos_super_admin_all on home_visit_photos for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy home_visit_photos_admin_manage on home_visit_photos for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy home_visit_photos_teacher_manage on home_visit_photos for all using (
    current_role_name() = 'teacher' and exists (select 1 from home_visits hv where hv.id = home_visit_id and is_my_student(hv.student_id))
  );
exception when duplicate_object then null; end $$;

-- household_profiles (staff-only, no parent/student select)
do $$ begin
  create policy household_profiles_super_admin_all on household_profiles for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy household_profiles_admin_manage on household_profiles for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy household_profiles_teacher_manage on household_profiles for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;

-- family_members (staff-only)
do $$ begin
  create policy family_members_super_admin_all on family_members for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy family_members_admin_manage on family_members for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy family_members_teacher_manage on family_members for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;

-- assistance_programs (staff-only catalog)
do $$ begin
  create policy assistance_programs_super_admin_all on assistance_programs for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy assistance_programs_admin_manage on assistance_programs for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy assistance_programs_teacher_manage on assistance_programs for select using (current_role_name() = 'teacher' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- student_assistance (staff-only, sensitive eligibility data)
do $$ begin
  create policy student_assistance_super_admin_all on student_assistance for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy student_assistance_admin_manage on student_assistance for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy student_assistance_teacher_manage on student_assistance for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;

-- intervention_plans (staff-only)
do $$ begin
  create policy intervention_plans_super_admin_all on intervention_plans for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy intervention_plans_admin_manage on intervention_plans for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy intervention_plans_teacher_manage on intervention_plans for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;

-- student_cases (staff-only)
do $$ begin
  create policy student_cases_super_admin_all on student_cases for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy student_cases_admin_manage on student_cases for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy student_cases_teacher_manage on student_cases for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;

-- parent_communications (staff-only - logs ABOUT parents, not visible TO them)
do $$ begin
  create policy parent_communications_super_admin_all on parent_communications for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy parent_communications_admin_manage on parent_communications for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy parent_communications_teacher_manage on parent_communications for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
