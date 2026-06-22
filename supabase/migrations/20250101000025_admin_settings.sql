-- ============================================================================
-- 0025: Admin Settings & Super Admin module
--
-- Additive migration backing the new /admin (super_admin only) and expanded
-- /settings (school_admin + super_admin) module. Does NOT rebuild existing
-- infra (schools/users RBAC/audit_logs/RLS helpers from 0001/0002/0009/0023)
-- - it extends it.
--
-- Scope notes (see task spec for full rationale):
--   * Roles: the existing hardcoded `role` enum + ROLE_PERMISSIONS map in
--     rbac.ts is extended with 5 new roles (principal, homeroom_teacher,
--     finance_officer, health_officer, guidance_teacher) rather than
--     replaced with a fully dynamic roles table - keeps RLS policies (which
--     already pattern-match on `current_role_name()`) working unchanged.
--     A `role_permissions` table is added ONLY for the UI-editable
--     permission matrix the spec asks for - it is informational/UI-facing
--     (drives the matrix screen) and does not replace rbac.ts's `can()` at
--     runtime, avoiding a parallel enforcement system that could drift from
--     the hardcoded one.
--   * system_settings: one JSONB-settings-by-category row per school
--     instead of 10 separate tables.
--   * login_logs: separate table (audit_logs intentionally stays
--     generic/no IP-device columns; login analytics has different access
--     patterns/retention than the audit trail).
--   * api_keys: per-school SMTP / SMS / backup-cloud credential storage
--     (school_admin self-service, so the ANTHROPIC_API_KEY env var pattern
--     doesn't have to be the only path).
--   * backup_jobs: manual export/restore job tracking (no real cron - see
--     code-level disclosure in src/lib/admin/backup.ts).
--   * theme_settings: per-school branding.
--   * school plan/quota: plan column on `schools` + a `school_quotas` table,
--     quota tracking only, no billing/payment processor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Roles: extend the existing enum (RLS policies keep working as-is -
--    none of them enumerate the full role list, they compare against
--    specific values like 'teacher'/'parent'/'student').
-- ----------------------------------------------------------------------------
alter type role add value if not exists 'principal';
alter type role add value if not exists 'homeroom_teacher';
alter type role add value if not exists 'finance_officer';
alter type role add value if not exists 'health_officer';
alter type role add value if not exists 'guidance_teacher';

-- ----------------------------------------------------------------------------
-- 2. role_permissions: UI-editable permission matrix (informational/UI
--    layer for the Role & Permission Matrix screen - see scope note above).
--    permission_key matches the "resource:action" strings used by
--    src/lib/auth/rbac.ts (e.g. "students:read", "finance:*").
-- ----------------------------------------------------------------------------
create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  role role not null,
  permission_key text not null,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, role, permission_key)
);

create index if not exists idx_role_permissions_school on role_permissions(school_id);

create trigger trg_role_permissions_updated_at before update on role_permissions
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. system_settings: one JSONB row per (school, category). Categories:
--    academic, attendance, behavior, finance, health, sdq, communication,
--    ai, theme, qr, document, security.
-- ----------------------------------------------------------------------------
create table if not exists system_settings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  category text not null,
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, category)
);

create index if not exists idx_system_settings_school on system_settings(school_id);

create trigger trg_system_settings_updated_at before update on system_settings
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. login_logs: login/device/IP tracking, separate from audit_logs.
-- ----------------------------------------------------------------------------
create table if not exists login_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  success boolean not null default true,
  ip_address text,
  user_agent text,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_logs_school on login_logs(school_id);
create index if not exists idx_login_logs_user on login_logs(user_id);
create index if not exists idx_login_logs_created_at on login_logs(created_at desc);

-- ----------------------------------------------------------------------------
-- 5. api_keys: per-school credential storage for SMTP / SMS / cloud backup
--    / 2FA issuer config. Secrets are expected to be stored encrypted at
--    the application layer before insert (out of scope to build a KMS here
--    - documented in src/lib/admin/integrations.ts); this table just holds
--    the configured-or-not state + non-secret metadata, with secret values
--    optionally present for school-level overrides of env vars.
-- ----------------------------------------------------------------------------
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  provider text not null, -- 'smtp' | 'sms' | 'backup_cloud' | 'totp'
  config jsonb not null default '{}'::jsonb, -- non-secret config (host, port, from-address, webhook url, bucket name...)
  secret_ciphertext text, -- optional, app-encrypted secret (password/api key/token); null = use env var fallback
  is_active boolean not null default true,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, provider)
);

create index if not exists idx_api_keys_school on api_keys(school_id);

create trigger trg_api_keys_updated_at before update on api_keys
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. backup_jobs: manual export/restore tracking.
-- ----------------------------------------------------------------------------
create table if not exists backup_jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade, -- null = super_admin full-instance export
  job_type text not null default 'manual', -- 'manual' | 'auto' (auto is reserved/unused - no real cron in this sandbox)
  direction text not null default 'backup', -- 'backup' | 'restore'
  target text not null default 'local', -- 'local' | 'cloud'
  status text not null default 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
  file_path text, -- storage path or signed URL of the resulting JSON snapshot
  row_counts jsonb,
  error_message text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_backup_jobs_school on backup_jobs(school_id);
create index if not exists idx_backup_jobs_created_at on backup_jobs(created_at desc);

-- ----------------------------------------------------------------------------
-- 7. theme_settings: per-school branding.
-- ----------------------------------------------------------------------------
create table if not exists theme_settings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade unique,
  primary_color text not null default '#4f46e5',
  secondary_color text not null default '#0ea5e9',
  logo_url text,
  favicon_url text,
  login_background_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_theme_settings_updated_at before update on theme_settings
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. api_usage_logs: lightweight per-route call counter (AI + admin API
--    usage dashboard). Intentionally minimal columns - instrumented only at
--    a handful of high-value routes (AI calls, admin API), not every route
--    in the app, to keep this proportionate.
-- ----------------------------------------------------------------------------
create table if not exists api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete set null,
  route text not null,
  kind text not null default 'api', -- 'api' | 'ai'
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_usage_logs_school on api_usage_logs(school_id);
create index if not exists idx_api_usage_logs_created_at on api_usage_logs(created_at desc);
create index if not exists idx_api_usage_logs_kind on api_usage_logs(kind);

-- ----------------------------------------------------------------------------
-- 9. Subscription plan + quotas (quota tracking only - NO billing/payment
--    processor; see src/lib/admin/quotas.ts).
-- ----------------------------------------------------------------------------
alter table schools add column if not exists plan text not null default 'free';
-- 'free' | 'school_standard' | 'school_pro' | 'district_enterprise'

create table if not exists school_quotas (
  school_id uuid primary key references schools(id) on delete cascade,
  max_students int not null default 100,
  max_teachers int not null default 10,
  max_storage_mb int not null default 500,
  ai_credits_per_month int not null default 100,
  ai_credits_used_this_month int not null default 0,
  updated_at timestamptz not null default now()
);

-- Seed a default quota row for every existing school so the subscription
-- page always has data to show, instead of a missing-row edge case.
insert into school_quotas (school_id)
select id from schools
on conflict (school_id) do nothing;

create or replace function ensure_school_quota()
returns trigger as $$
begin
  insert into school_quotas (school_id) values (new.id) on conflict (school_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_schools_ensure_quota on schools;
create trigger trg_schools_ensure_quota after insert on schools
  for each row execute function ensure_school_quota();

-- Real, cheap enforcement: block student creation past max_students for the
-- school (per scope decision 3 - "one or two real enforcement checks where
-- it's cheap"). Soft-deleted students don't count against the quota.
create or replace function enforce_student_quota()
returns trigger as $$
declare
  current_count int;
  quota_max int;
begin
  select max_students into quota_max from school_quotas where school_id = new.school_id;
  if quota_max is null then
    return new; -- no quota row (shouldn't happen once seeded) - don't block
  end if;
  select count(*) into current_count from students where school_id = new.school_id and deleted_at is null;
  if current_count >= quota_max then
    raise exception 'STUDENT_QUOTA_EXCEEDED: school % has reached its plan limit of % students', new.school_id, quota_max;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_students_enforce_quota on students;
create trigger trg_students_enforce_quota before insert on students
  for each row execute function enforce_student_quota();

-- ----------------------------------------------------------------------------
-- 10. App-level metrics helper for "System Health" (Supabase DB size / row
--     counts) - a SECURITY DEFINER function so non-superuser app roles can
--     call it without needing direct pg_catalog grants. Returns one row per
--     tracked table; the admin dashboard route sums/displays as needed.
--     NO OS-level CPU/memory - genuinely not available in this
--     Vercel/Supabase architecture (disclosed honestly per task scope).
-- ----------------------------------------------------------------------------
create or replace function admin_table_stats()
returns table(table_name text, row_estimate bigint, total_bytes bigint) as $$
  select
    relname::text as table_name,
    reltuples::bigint as row_estimate,
    pg_total_relation_size(c.oid) as total_bytes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by total_bytes desc;
$$ language sql stable security definer;

-- ----------------------------------------------------------------------------
-- 11. RLS policies - consistent with existing pattern: super_admin
--     bypasses school_id scoping (handled by rbac.ts/route-level checks
--     since these are admin-only tables; RLS here scopes school_admin to
--     their own school and lets super_admin see all via a role check).
-- ----------------------------------------------------------------------------
alter table role_permissions enable row level security;
alter table system_settings enable row level security;
alter table login_logs enable row level security;
alter table api_keys enable row level security;
alter table backup_jobs enable row level security;
alter table theme_settings enable row level security;
alter table api_usage_logs enable row level security;
alter table school_quotas enable row level security;

create policy role_permissions_super_admin_all on role_permissions for all
  using (current_role_name() = 'super_admin');
create policy role_permissions_school_admin on role_permissions for all
  using (current_role_name() = 'school_admin' and school_id = current_school_id());

create policy system_settings_super_admin_all on system_settings for all
  using (current_role_name() = 'super_admin');
create policy system_settings_school_admin on system_settings for all
  using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy system_settings_member_select on system_settings for select
  using (school_id = current_school_id());

create policy login_logs_super_admin_all on login_logs for all
  using (current_role_name() = 'super_admin');
create policy login_logs_school_admin_select on login_logs for select
  using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy login_logs_insert on login_logs for insert
  with check (true);

create policy api_keys_super_admin_all on api_keys for all
  using (current_role_name() = 'super_admin');
create policy api_keys_school_admin on api_keys for all
  using (current_role_name() = 'school_admin' and school_id = current_school_id());

create policy backup_jobs_super_admin_all on backup_jobs for all
  using (current_role_name() = 'super_admin');
create policy backup_jobs_school_admin on backup_jobs for all
  using (current_role_name() = 'school_admin' and school_id = current_school_id());

create policy theme_settings_super_admin_all on theme_settings for all
  using (current_role_name() = 'super_admin');
create policy theme_settings_school_admin on theme_settings for all
  using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy theme_settings_member_select on theme_settings for select
  using (school_id = current_school_id());

create policy api_usage_logs_super_admin_all on api_usage_logs for all
  using (current_role_name() = 'super_admin');
create policy api_usage_logs_school_admin_select on api_usage_logs for select
  using (current_role_name() = 'school_admin' and school_id = current_school_id());
create policy api_usage_logs_insert on api_usage_logs for insert
  with check (true);

create policy school_quotas_super_admin_all on school_quotas for all
  using (current_role_name() = 'super_admin');
create policy school_quotas_school_admin_select on school_quotas for select
  using (current_role_name() = 'school_admin' and school_id = current_school_id());
