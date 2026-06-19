-- ============================================================================
-- 0016: Health v2 - Module 7 Student Health & Nutrition System
--
-- Reuses (does NOT duplicate):
--   - students.blood_type, students.avatar_url, students.emergency_contact_name/
--     relationship/phone (added in migration 0011): the Health Profile and
--     Emergency Management screens read these directly from `students`
--     instead of a new "health_profiles" table.
--   - health_records (0006): extended in place to become the height/weight/
--     BMI growth-measurement log (Height & Weight Tracking + BMI System +
--     Nutrition Analysis). Added bmi/nutrition_status/growth-tracking columns
--     and a recorder/remarks alias instead of creating new
--     "health_measurements" / "bmi_records" tables.
--   - vaccinations (0006): extended in place with status/hospital/dose
--     tracking fields (Vaccination Management) instead of a duplicate table.
--   - notifications (0002/0009 RLS): reused for health alert delivery to
--     parents/students instead of a separate delivery mechanism.
--   - is_my_child() / is_my_student() / current_role_name() / current_school_id()
--     RLS helpers (0009): reused as-is for every new table below.
--
-- New tables (genuinely new concepts not covered above):
--   vaccination_schedules (reference catalog: vaccine + recommended age/dose),
--   medical_conditions, allergies, health_screenings, dental_records,
--   medications, health_alerts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extend health_records -> growth/BMI measurement log
-- ----------------------------------------------------------------------------
alter table health_records add column if not exists bmi numeric;
alter table health_records add column if not exists nutrition_status text;
do $$ begin
  alter table health_records add constraint health_records_nutrition_status_check
    check (nutrition_status is null or nutrition_status in (
      'severely_underweight', 'underweight', 'normal', 'overweight', 'obese'
    ));
exception when duplicate_object then null;
end $$;
alter table health_records add column if not exists vision_screening_result text;
alter table health_records add column if not exists remarks text;

create index if not exists idx_health_records_recorded_at on health_records(recorded_at);
create index if not exists idx_health_records_nutrition_status on health_records(nutrition_status);

-- ----------------------------------------------------------------------------
-- Extend vaccinations -> add status/hospital/reminder fields
-- ----------------------------------------------------------------------------
alter table vaccinations add column if not exists status text not null default 'completed';
do $$ begin
  alter table vaccinations add constraint vaccinations_status_check
    check (status in ('scheduled', 'completed', 'overdue', 'exempted'));
exception when duplicate_object then null;
end $$;
alter table vaccinations add column if not exists hospital text;
alter table vaccinations add column if not exists recorded_by uuid references users(id) on delete set null;

create index if not exists idx_vaccinations_status on vaccinations(status);
create index if not exists idx_vaccinations_next_due_at on vaccinations(next_due_at);

-- ----------------------------------------------------------------------------
-- vaccination_schedules: reference catalog of vaccine types + recommended ages
-- ----------------------------------------------------------------------------
create table if not exists vaccination_schedules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  vaccine_name text not null,
  dose_number int not null default 1,
  recommended_age_months int,
  is_required boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vaccination_schedules_school on vaccination_schedules(school_id);

insert into vaccination_schedules (school_id, vaccine_name, dose_number, recommended_age_months, is_required)
select null, name, dose, age, true
from (values
  ('BCG', 1, 0),
  ('HBV', 1, 0),
  ('DTP', 1, 24),
  ('DTP', 2, 48),
  ('MMR', 1, 9),
  ('MMR', 2, 30),
  ('Polio', 1, 24),
  ('Polio', 2, 48),
  ('COVID-19', 1, 144),
  ('Influenza', 1, 6)
) as seed(name, dose, age)
where not exists (select 1 from vaccination_schedules where school_id is null);

-- ----------------------------------------------------------------------------
-- medical_conditions: chronic/congenital/disability/learning/mental health
-- ----------------------------------------------------------------------------
create table if not exists medical_conditions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  condition_type text not null check (condition_type in (
    'chronic', 'congenital', 'physical_disability', 'learning_disability', 'mental_health'
  )),
  name text not null,
  severity text not null default 'moderate' check (severity in ('mild', 'moderate', 'severe')),
  diagnosed_date date,
  notes text,
  care_instructions text,
  is_active boolean not null default true,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_medical_conditions_updated_at before update on medical_conditions for each row execute function set_updated_at();
create index if not exists idx_medical_conditions_student on medical_conditions(student_id);
create index if not exists idx_medical_conditions_school on medical_conditions(school_id);

-- ----------------------------------------------------------------------------
-- allergies: food/drug/environmental allergies with severity + emergency plan
-- ----------------------------------------------------------------------------
create table if not exists allergies (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  allergy_type text not null check (allergy_type in ('food', 'drug', 'environmental')),
  allergen text not null,
  severity text not null default 'mild' check (severity in ('mild', 'moderate', 'severe', 'life_threatening')),
  reaction text,
  emergency_instructions text,
  is_active boolean not null default true,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_allergies_updated_at before update on allergies for each row execute function set_updated_at();
create index if not exists idx_allergies_student on allergies(student_id);
create index if not exists idx_allergies_school on allergies(school_id);
create index if not exists idx_allergies_active on allergies(is_active);

-- ----------------------------------------------------------------------------
-- health_screenings: vision/hearing/dental/physical/mental screening records
-- ----------------------------------------------------------------------------
create table if not exists health_screenings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  screening_type text not null check (screening_type in ('vision', 'hearing', 'dental', 'physical', 'mental_health')),
  screening_date date not null default current_date,
  result text not null check (result in ('pass', 'monitor', 'refer')),
  findings text,
  recommendation text,
  next_screening_date date,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_health_screenings_updated_at before update on health_screenings for each row execute function set_updated_at();
create index if not exists idx_health_screenings_student on health_screenings(student_id);
create index if not exists idx_health_screenings_type on health_screenings(screening_type);

-- ----------------------------------------------------------------------------
-- dental_records: dedicated dental health module (dental_records extends
-- the generic health_screenings table with dental-specific structured data)
-- ----------------------------------------------------------------------------
create table if not exists dental_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  checkup_date date not null default current_date,
  tooth_decay_count int not null default 0,
  oral_hygiene_status text not null default 'good' check (oral_hygiene_status in ('good', 'fair', 'poor')),
  treatment_needed text,
  treatment_completed boolean not null default false,
  notes text,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_dental_records_updated_at before update on dental_records for each row execute function set_updated_at();
create index if not exists idx_dental_records_student on dental_records(student_id);

-- ----------------------------------------------------------------------------
-- medications: medication name/dosage/schedule/doctor/instructions
-- ----------------------------------------------------------------------------
create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  medication_name text not null,
  dosage text,
  schedule text,
  prescribing_doctor text,
  instructions text,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  special_care_notes text,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_medications_updated_at before update on medications for each row execute function set_updated_at();
create index if not exists idx_medications_student on medications(student_id);
create index if not exists idx_medications_active on medications(is_active);

-- ----------------------------------------------------------------------------
-- health_alerts: generated alerts (missing records, vaccination due, BMI risk,
-- medical condition risk, screening due)
-- ----------------------------------------------------------------------------
create table if not exists health_alerts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  alert_type text not null check (alert_type in (
    'missing_record', 'vaccination_due', 'bmi_risk', 'medical_condition_risk',
    'screening_due', 'allergy_alert'
  )),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  message text not null,
  is_resolved boolean not null default false,
  resolved_by uuid references users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_health_alerts_student on health_alerts(student_id);
create index if not exists idx_health_alerts_school on health_alerts(school_id);
create index if not exists idx_health_alerts_resolved on health_alerts(is_resolved);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table vaccination_schedules enable row level security;
alter table medical_conditions enable row level security;
alter table allergies enable row level security;
alter table health_screenings enable row level security;
alter table dental_records enable row level security;
alter table medications enable row level security;
alter table health_alerts enable row level security;

-- vaccination_schedules (reference data, readable by all members of the school or global)
do $$ begin
  create policy vaccination_schedules_super_admin_all on vaccination_schedules for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy vaccination_schedules_select on vaccination_schedules for select using (school_id is null or school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy vaccination_schedules_admin_manage on vaccination_schedules for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- medical_conditions (sensitive — teacher/admin manage, parent/student read own)
do $$ begin
  create policy medical_conditions_super_admin_all on medical_conditions for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy medical_conditions_admin_manage on medical_conditions for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy medical_conditions_teacher_manage on medical_conditions for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy medical_conditions_parent_select on medical_conditions for select using (current_role_name() = 'parent' and is_my_child(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy medical_conditions_student_select on medical_conditions for select using (current_role_name() = 'student' and student_id = current_student_id());
exception when duplicate_object then null; end $$;

-- allergies
do $$ begin
  create policy allergies_super_admin_all on allergies for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy allergies_admin_manage on allergies for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy allergies_teacher_manage on allergies for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy allergies_parent_select on allergies for select using (current_role_name() = 'parent' and is_my_child(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy allergies_student_select on allergies for select using (current_role_name() = 'student' and student_id = current_student_id());
exception when duplicate_object then null; end $$;

-- health_screenings
do $$ begin
  create policy health_screenings_super_admin_all on health_screenings for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy health_screenings_admin_manage on health_screenings for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy health_screenings_teacher_manage on health_screenings for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy health_screenings_parent_select on health_screenings for select using (current_role_name() = 'parent' and is_my_child(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy health_screenings_student_select on health_screenings for select using (current_role_name() = 'student' and student_id = current_student_id());
exception when duplicate_object then null; end $$;

-- dental_records
do $$ begin
  create policy dental_records_super_admin_all on dental_records for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy dental_records_admin_manage on dental_records for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy dental_records_teacher_manage on dental_records for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy dental_records_parent_select on dental_records for select using (current_role_name() = 'parent' and is_my_child(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy dental_records_student_select on dental_records for select using (current_role_name() = 'student' and student_id = current_student_id());
exception when duplicate_object then null; end $$;

-- medications (sensitive — teacher/admin manage, parent/student read own)
do $$ begin
  create policy medications_super_admin_all on medications for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy medications_admin_manage on medications for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy medications_teacher_manage on medications for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy medications_parent_select on medications for select using (current_role_name() = 'parent' and is_my_child(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy medications_student_select on medications for select using (current_role_name() = 'student' and student_id = current_student_id());
exception when duplicate_object then null; end $$;

-- health_alerts
do $$ begin
  create policy health_alerts_super_admin_all on health_alerts for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy health_alerts_admin_manage on health_alerts for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy health_alerts_teacher_manage on health_alerts for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy health_alerts_parent_select on health_alerts for select using (current_role_name() = 'parent' and is_my_child(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy health_alerts_student_select on health_alerts for select using (current_role_name() = 'student' and student_id = current_student_id());
exception when duplicate_object then null; end $$;
