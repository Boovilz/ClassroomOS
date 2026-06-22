-- ============================================================================
-- 0024: Student Import Ecosystem - import_jobs / import_job_rows
--
-- Additive only: no existing migration is touched. Reuses the existing
-- `students.deleted_at` soft-delete mechanism for rollback (no second
-- delete mechanism), and the existing `audit_logs` table for rollback
-- audit entries (see src/lib/audit.ts).
-- ============================================================================

create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  source text not null check (source in ('excel', 'csv', 'api', 'qr')),
  file_name text,
  imported_by uuid references users(id) on delete set null,
  total_rows integer not null default 0,
  succeeded_count integer not null default 0,
  updated_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'completed_with_errors', 'rolled_back')),
  created_at timestamptz not null default now()
);

create index if not exists idx_import_jobs_school on import_jobs(school_id);
create index if not exists idx_import_jobs_created_at on import_jobs(created_at desc);

create table if not exists import_job_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references import_jobs(id) on delete cascade,
  row_number integer not null,
  student_id uuid references students(id) on delete set null,
  action text not null check (action in ('created', 'updated', 'merged', 'skipped', 'failed')),
  previous_values jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_import_job_rows_job on import_job_rows(import_job_id);
create index if not exists idx_import_job_rows_student on import_job_rows(student_id);

alter table import_jobs enable row level security;
alter table import_job_rows enable row level security;

-- school_admin/teacher: manage (select/insert/update) rows scoped to their
-- own school. super_admin: full access to all schools.
drop policy if exists import_jobs_school_scope on import_jobs;
create policy import_jobs_school_scope on import_jobs for all
  using (school_id = current_school_id() or current_role_name() = 'super_admin')
  with check (school_id = current_school_id() or current_role_name() = 'super_admin');

drop policy if exists import_job_rows_school_scope on import_job_rows;
create policy import_job_rows_school_scope on import_job_rows for all
  using (
    current_role_name() = 'super_admin'
    or exists (select 1 from import_jobs j where j.id = import_job_rows.import_job_id and j.school_id = current_school_id())
  )
  with check (
    current_role_name() = 'super_admin'
    or exists (select 1 from import_jobs j where j.id = import_job_rows.import_job_id and j.school_id = current_school_id())
  );
