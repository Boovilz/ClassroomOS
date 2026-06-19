-- ============================================================================
-- 0005: Academic - subjects, scores, assignments
-- ============================================================================

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  code text,
  teacher_id uuid references teachers(id) on delete set null,
  grade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  description text,
  max_score numeric not null default 100,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  assignment_id uuid references assignments(id) on delete set null,
  score numeric not null,
  max_score numeric not null default 100,
  term text,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_subjects_updated_at before update on subjects for each row execute function set_updated_at();
create trigger trg_assignments_updated_at before update on assignments for each row execute function set_updated_at();
create trigger trg_scores_updated_at before update on scores for each row execute function set_updated_at();

create index if not exists idx_subjects_school on subjects(school_id);
create index if not exists idx_scores_student on scores(student_id);
create index if not exists idx_scores_subject on scores(subject_id);
