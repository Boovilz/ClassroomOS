-- ============================================================================
-- 0008: Tier 3 modules - lunch, home visits, SDQ, documents, communication,
-- notifications, audit log.
--
-- These tables back routes that are currently SCAFFOLD ONLY in the app
-- (route + page shell + TODO, no real queries wired up yet). They are
-- defined now so the schema is complete and future work has a target shape.
-- ============================================================================

create table if not exists meal_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snack')),
  status text not null default 'served' check (status in ('served', 'absent', 'special_diet')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists home_visits (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid references teachers(id) on delete set null,
  visit_date date not null,
  summary text,
  family_situation text,
  follow_up_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Strengths and Difficulties Questionnaire assessments.
create table if not exists sdq_assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  assessed_by uuid references users(id) on delete set null,
  assessment_date date not null default current_date,
  emotional_score int,
  conduct_score int,
  hyperactivity_score int,
  peer_problems_score int,
  prosocial_score int,
  total_difficulties_score int,
  risk_level text check (risk_level in ('normal', 'borderline', 'abnormal')),
  raw_answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  uploaded_by uuid references users(id) on delete set null,
  title text not null,
  category text,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'teachers', 'parents', 'students')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete set null,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_table text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create trigger trg_meal_records_updated_at before update on meal_records for each row execute function set_updated_at();
create trigger trg_home_visits_updated_at before update on home_visits for each row execute function set_updated_at();
create trigger trg_sdq_assessments_updated_at before update on sdq_assessments for each row execute function set_updated_at();
create trigger trg_documents_updated_at before update on documents for each row execute function set_updated_at();
create trigger trg_announcements_updated_at before update on announcements for each row execute function set_updated_at();

create index if not exists idx_meal_records_student on meal_records(student_id);
create index if not exists idx_home_visits_student on home_visits(student_id);
create index if not exists idx_sdq_assessments_student on sdq_assessments(student_id);
create index if not exists idx_documents_student on documents(student_id);
create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_audit_logs_school on audit_logs(school_id);
