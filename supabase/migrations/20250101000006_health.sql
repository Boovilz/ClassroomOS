-- ============================================================================
-- 0006: Health - health records, vaccinations
-- ============================================================================

create table if not exists health_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  height_cm numeric,
  weight_kg numeric,
  vision_left text,
  vision_right text,
  allergies text,
  chronic_conditions text,
  notes text,
  recorded_by uuid references users(id) on delete set null,
  recorded_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vaccinations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  vaccine_name text not null,
  dose_number int,
  administered_at date,
  next_due_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_health_records_updated_at before update on health_records for each row execute function set_updated_at();
create trigger trg_vaccinations_updated_at before update on vaccinations for each row execute function set_updated_at();

create index if not exists idx_health_records_student on health_records(student_id);
create index if not exists idx_vaccinations_student on vaccinations(student_id);
