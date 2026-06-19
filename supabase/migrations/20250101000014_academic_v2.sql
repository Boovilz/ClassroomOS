-- ============================================================================
-- 0014: Academic Management & ปพ.5/ปพ.6 v2
--
-- Reuses existing subjects/assignments/scores rather than duplicating them;
-- ALTERs add the columns the spec needs (semester/academic_year scoping,
-- K/P/A assessment categorization, submission/rubric attachments). New
-- tables cover the genuinely new concepts: configurable gradebook weights,
-- assignment submissions, rubrics + rubric scoring, learning standards +
-- outcomes, and issued certificates. Report cards / ปพ.5 / ปพ.6 are NOT
-- stored tables — they are computed on demand from this data (same
-- philosophy as `dashboard_statistics`/`attendance_reports` being skipped
-- in earlier modules).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- subjects: add lightweight semester/year + credit columns (no normalized
-- academic_years/semesters tables — computed/lightweight philosophy).
-- ---------------------------------------------------------------------------
alter table subjects add column if not exists credits numeric not null default 1;
alter table subjects add column if not exists academic_year int;
alter table subjects add column if not exists semester int check (semester in (1, 2));
alter table subjects add column if not exists description text;

-- ---------------------------------------------------------------------------
-- assignments: due_date already exists; add rubric link + attachment +
-- assessment categorization so an assignment can declare what it measures.
-- ---------------------------------------------------------------------------
alter table assignments add column if not exists file_url text;
alter table assignments add column if not exists assessment_type text
  check (assessment_type in ('knowledge', 'process', 'attitude', 'competency', 'characteristic'));
alter table assignments add column if not exists method text
  check (method in ('quiz', 'exam', 'project', 'observation', 'portfolio', 'performance_task', 'homework'));
-- rubric_id added after rubrics table exists, below.

-- ---------------------------------------------------------------------------
-- scores: add K/P/A categorization + method, mirroring assignments, so
-- scores not tied to an assignment (e.g. midterm/final entered directly)
-- can still be classified for weighted gradebook calculation.
-- ---------------------------------------------------------------------------
alter table scores add column if not exists assessment_type text
  check (assessment_type in ('knowledge', 'process', 'attitude', 'competency', 'characteristic'));
alter table scores add column if not exists method text
  check (method in ('quiz', 'exam', 'project', 'observation', 'portfolio', 'performance_task', 'homework'));
alter table scores add column if not exists component text
  check (component in ('attendance', 'homework', 'assignment', 'quiz', 'midterm', 'final', 'project', 'behavior'));

create index if not exists idx_assignments_due_date on assignments(due_date);

-- ---------------------------------------------------------------------------
-- gradebook_weights: per-subject configurable weighted calculation. Must
-- sum to 100; enforced at the application layer (Postgres check constraints
-- across columns are fine here since the set of components is fixed).
-- ---------------------------------------------------------------------------
create table if not exists gradebook_weights (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  subject_id uuid not null unique references subjects(id) on delete cascade,
  attendance_weight numeric not null default 10,
  homework_weight numeric not null default 15,
  assignment_weight numeric not null default 15,
  quiz_weight numeric not null default 10,
  midterm_weight numeric not null default 20,
  final_weight numeric not null default 20,
  project_weight numeric not null default 5,
  behavior_weight numeric not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_gradebook_weights_updated_at before update on gradebook_weights for each row execute function set_updated_at();
create index if not exists idx_gradebook_weights_school on gradebook_weights(school_id);

-- ---------------------------------------------------------------------------
-- assignment_submissions: per-student submission tracking.
-- ---------------------------------------------------------------------------
create table if not exists assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'late', 'graded', 'returned')),
  file_url text,
  notes text,
  submitted_at timestamptz,
  graded_at timestamptz,
  score numeric,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create trigger trg_assignment_submissions_updated_at before update on assignment_submissions for each row execute function set_updated_at();
create index if not exists idx_assignment_submissions_assignment on assignment_submissions(assignment_id);
create index if not exists idx_assignment_submissions_student on assignment_submissions(student_id);

-- ---------------------------------------------------------------------------
-- rubrics + rubric_scores: criteria x level scoring grid.
-- ---------------------------------------------------------------------------
create table if not exists rubrics (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  -- criteria: jsonb array of { name: string, levels: [{ label: string, points: number }] }
  criteria jsonb not null default '[]'::jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_rubrics_updated_at before update on rubrics for each row execute function set_updated_at();
create index if not exists idx_rubrics_subject on rubrics(subject_id);

create table if not exists rubric_scores (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  rubric_id uuid not null references rubrics(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  assignment_id uuid references assignments(id) on delete set null,
  -- scores: jsonb array of { criterion: string, levelLabel: string, points: number }
  scores jsonb not null default '[]'::jsonb,
  total_score numeric not null default 0,
  scored_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_rubric_scores_updated_at before update on rubric_scores for each row execute function set_updated_at();
create index if not exists idx_rubric_scores_student on rubric_scores(student_id);
create index if not exists idx_rubric_scores_rubric on rubric_scores(rubric_id);

-- now that rubrics exists, add the nullable FK on assignments.
alter table assignments add column if not exists rubric_id uuid references rubrics(id) on delete set null;

-- ---------------------------------------------------------------------------
-- learning_standards + learning_outcomes
-- ---------------------------------------------------------------------------
create table if not exists learning_standards (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  code text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_learning_standards_subject on learning_standards(subject_id);

create table if not exists learning_outcomes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  standard_id uuid not null references learning_standards(id) on delete cascade,
  status text not null check (status in ('achieved', 'partially_achieved', 'needs_improvement')),
  assessed_at date not null default current_date,
  assessed_by uuid references users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_learning_outcomes_student on learning_outcomes(student_id);
create index if not exists idx_learning_outcomes_standard on learning_outcomes(standard_id);

-- ---------------------------------------------------------------------------
-- academic_certificates: discrete issued/generated documents worth a
-- record (unlike on-demand report cards / ปพ.5 / ปพ.6).
-- ---------------------------------------------------------------------------
create table if not exists academic_certificates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  template_type text not null check (template_type in ('graduation', 'honor_roll', 'perfect_attendance', 'subject_excellence', 'completion', 'other')),
  title text not null,
  description text,
  issued_at timestamptz not null default now(),
  issued_by uuid references users(id) on delete set null,
  file_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_academic_certificates_student on academic_certificates(student_id);
create index if not exists idx_academic_certificates_school on academic_certificates(school_id);

-- ============================================================================
-- RLS
-- ============================================================================

alter table gradebook_weights enable row level security;
alter table assignment_submissions enable row level security;
alter table rubrics enable row level security;
alter table rubric_scores enable row level security;
alter table learning_standards enable row level security;
alter table learning_outcomes enable row level security;
alter table academic_certificates enable row level security;

-- gradebook_weights (school-wide reference/config data, admin/teacher managed)
create policy gradebook_weights_super_admin_all on gradebook_weights for all using (current_role_name() = 'super_admin');
create policy gradebook_weights_school_select on gradebook_weights for select using (school_id = current_school_id());
create policy gradebook_weights_admin_teacher_manage on gradebook_weights for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

-- assignment_submissions (per-student scoped, plus the student themself can insert/update their own submission)
create policy assignment_submissions_super_admin_all on assignment_submissions for all using (current_role_name() = 'super_admin');
create policy assignment_submissions_admin_manage on assignment_submissions for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy assignment_submissions_teacher_manage on assignment_submissions for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy assignment_submissions_parent_select on assignment_submissions for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy assignment_submissions_student_manage on assignment_submissions for all using (current_role_name() = 'student' and student_id = current_student_id());

-- rubrics (school-wide reference data, admin/teacher managed)
create policy rubrics_super_admin_all on rubrics for all using (current_role_name() = 'super_admin');
create policy rubrics_school_select on rubrics for select using (school_id = current_school_id());
create policy rubrics_admin_teacher_manage on rubrics for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

-- rubric_scores (per-student scoped)
create policy rubric_scores_super_admin_all on rubric_scores for all using (current_role_name() = 'super_admin');
create policy rubric_scores_admin_manage on rubric_scores for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy rubric_scores_teacher_manage on rubric_scores for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy rubric_scores_parent_select on rubric_scores for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy rubric_scores_student_select on rubric_scores for select using (current_role_name() = 'student' and student_id = current_student_id());

-- learning_standards (school-wide reference data, admin/teacher managed)
create policy learning_standards_super_admin_all on learning_standards for all using (current_role_name() = 'super_admin');
create policy learning_standards_school_select on learning_standards for select using (school_id = current_school_id());
create policy learning_standards_admin_teacher_manage on learning_standards for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

-- learning_outcomes (per-student scoped)
create policy learning_outcomes_super_admin_all on learning_outcomes for all using (current_role_name() = 'super_admin');
create policy learning_outcomes_admin_manage on learning_outcomes for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy learning_outcomes_teacher_manage on learning_outcomes for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy learning_outcomes_parent_select on learning_outcomes for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy learning_outcomes_student_select on learning_outcomes for select using (current_role_name() = 'student' and student_id = current_student_id());

-- academic_certificates (per-student scoped; admin/teacher issue, parent/student view)
create policy academic_certificates_super_admin_all on academic_certificates for all using (current_role_name() = 'super_admin');
create policy academic_certificates_admin_teacher_manage on academic_certificates for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());
create policy academic_certificates_parent_select on academic_certificates for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy academic_certificates_student_select on academic_certificates for select using (current_role_name() = 'student' and student_id = current_student_id());
