-- Extra modules: EQ Assessments, Clubs, Teaching Supervision
-- Migration: 20250101000029_extra_modules.sql

-- ============================================================
-- EQ (Emotional Quotient) Assessments
-- ============================================================
create table if not exists eq_assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  assessed_by uuid references users(id),
  assessed_at timestamptz not null default now(),
  -- Five EQ dimensions (1–5 scale each)
  self_awareness int check (self_awareness between 1 and 5),
  self_regulation int check (self_regulation between 1 and 5),
  motivation int check (motivation between 1 and 5),
  empathy int check (empathy between 1 and 5),
  social_skills int check (social_skills between 1 and 5),
  -- Computed total (stored for fast query)
  total_score int generated always as (
    coalesce(self_awareness,0)+coalesce(self_regulation,0)+coalesce(motivation,0)+coalesce(empathy,0)+coalesce(social_skills,0)
  ) stored,
  eq_level text check (eq_level in ('low','moderate','high','excellent')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Clubs / ชุมนุม
-- ============================================================
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  name text not null,
  description text,
  teacher_id uuid references teachers(id),
  max_members int,
  academic_year text,
  semester text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade not null,
  student_id uuid references students(id) on delete cascade not null,
  joined_at timestamptz default now(),
  status text default 'active' check (status in ('active','inactive','dropped')),
  attendance_count int default 0,
  notes text,
  unique(club_id, student_id)
);

-- ============================================================
-- Teaching Supervision / แบบบันทึกการนิเทศ
-- ============================================================
create table if not exists supervision_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade not null,
  supervisor_id uuid references users(id),
  teacher_id uuid references teachers(id),
  supervised_at timestamptz not null default now(),
  subject text,
  classroom text,
  topic text,
  student_count int,
  -- Evaluation dimensions (1–5)
  lesson_plan_score int check (lesson_plan_score between 1 and 5),
  teaching_method_score int check (teaching_method_score between 1 and 5),
  media_score int check (media_score between 1 and 5),
  assessment_score int check (assessment_score between 1 and 5),
  classroom_management_score int check (classroom_management_score between 1 and 5),
  total_score int generated always as (
    coalesce(lesson_plan_score,0)+coalesce(teaching_method_score,0)+coalesce(media_score,0)+coalesce(assessment_score,0)+coalesce(classroom_management_score,0)
  ) stored,
  strengths text,
  improvements text,
  suggestions text,
  follow_up_date date,
  status text default 'draft' check (status in ('draft','completed','acknowledged')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_eq_assessments_school on eq_assessments(school_id);
create index if not exists idx_eq_assessments_student on eq_assessments(student_id);
create index if not exists idx_clubs_school on clubs(school_id);
create index if not exists idx_club_memberships_club on club_memberships(club_id);
create index if not exists idx_club_memberships_student on club_memberships(student_id);
create index if not exists idx_supervision_records_school on supervision_records(school_id);
create index if not exists idx_supervision_records_teacher on supervision_records(teacher_id);

-- ============================================================
-- updated_at triggers
-- ============================================================
create trigger trg_eq_assessments_updated_at
  before update on eq_assessments
  for each row execute function set_updated_at();

create trigger trg_clubs_updated_at
  before update on clubs
  for each row execute function set_updated_at();

create trigger trg_supervision_records_updated_at
  before update on supervision_records
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table eq_assessments enable row level security;
alter table clubs enable row level security;
alter table club_memberships enable row level security;
alter table supervision_records enable row level security;

-- eq_assessments policies
do $$ begin
  create policy eq_assessments_super_admin_all on eq_assessments
    for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy eq_assessments_school_select on eq_assessments
    for select using (school_id = current_school_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy eq_assessments_school_insert on eq_assessments
    for insert with check (school_id = current_school_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy eq_assessments_school_update on eq_assessments
    for update using (school_id = current_school_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy eq_assessments_school_delete on eq_assessments
    for delete using (school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- clubs policies
do $$ begin
  create policy clubs_super_admin_all on clubs
    for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy clubs_school_select on clubs
    for select using (school_id = current_school_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy clubs_school_insert on clubs
    for insert with check (school_id = current_school_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy clubs_school_update on clubs
    for update using (school_id = current_school_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy clubs_school_delete on clubs
    for delete using (school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- club_memberships policies (join to clubs for school_id)
do $$ begin
  create policy club_memberships_super_admin_all on club_memberships
    for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy club_memberships_school_select on club_memberships
    for select using (
      exists (select 1 from clubs c where c.id = club_id and c.school_id = current_school_id())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy club_memberships_school_insert on club_memberships
    for insert with check (
      exists (select 1 from clubs c where c.id = club_id and c.school_id = current_school_id())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy club_memberships_school_update on club_memberships
    for update using (
      exists (select 1 from clubs c where c.id = club_id and c.school_id = current_school_id())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy club_memberships_school_delete on club_memberships
    for delete using (
      exists (select 1 from clubs c where c.id = club_id and c.school_id = current_school_id())
    );
exception when duplicate_object then null; end $$;

-- supervision_records policies
do $$ begin
  create policy supervision_records_super_admin_all on supervision_records
    for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy supervision_records_school_select on supervision_records
    for select using (school_id = current_school_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy supervision_records_school_insert on supervision_records
    for insert with check (school_id = current_school_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy supervision_records_school_update on supervision_records
    for update using (school_id = current_school_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy supervision_records_school_delete on supervision_records
    for delete using (school_id = current_school_id());
exception when duplicate_object then null; end $$;
