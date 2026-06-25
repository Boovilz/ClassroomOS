-- ============================================================================
-- 0028: Document Template Engine (Module 13) - first milestone
--
-- Scope (per the scoped first-milestone decision, NOT the full spec):
--   * One file format engine: Word (.docx) via docxtemplater, single-student
--     generation only. Batch/classroom generation, dynamic repeating tables,
--     conditional rendering, charts, digital signatures, versioning, and the
--     drag-and-drop builder are explicitly deferred to later passes.
--   * document_templates: one row per uploaded .docx template. `fields` is a
--     jsonb array of the {{placeholder}} keys detected on upload (see
--     src/lib/documents/engine.ts) - this is the "field mapping engine"'s
--     persisted output, not a separate template_fields table, since v1 only
--     needs to display detected fields back to the admin, not manage them
--     as independent rows.
--   * generated_documents: one row per generated file, for the archive/
--     history list. No separate document_jobs/document_logs/document_exports
--     tables yet - v1 generation is synchronous (no job queue) and the
--     existing audit_logs table is reused for an audit trail instead of a
--     parallel document_logs table.
--   * Storage: two buckets, `document-templates` (uploaded source .docx
--     files) and `generated-documents` (rendered output files), both
--     private - access goes through the API routes (which use the
--     server-side Supabase client under the user's session, so the
--     RLS policies below still apply) rather than public URLs.
-- ============================================================================

create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  description text,
  category text not null check (category in (
    'attendance', 'milk', 'lunch', 'academic', 'behavior', 'health', 'bmi',
    'home_visit', 'sdq', 'finance', 'savings', 'certificate', 'report_card',
    'pta_meeting', 'official_letter', 'government_form', 'custom'
  )),
  storage_path text not null,
  fields jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references users(id) on delete set null,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_templates_school on document_templates(school_id);
create index if not exists idx_document_templates_category on document_templates(school_id, category);

create table if not exists generated_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  template_id uuid not null references document_templates(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  generated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_generated_documents_school on generated_documents(school_id);
create index if not exists idx_generated_documents_template on generated_documents(template_id);
create index if not exists idx_generated_documents_student on generated_documents(student_id);

alter table document_templates enable row level security;
alter table generated_documents enable row level security;

drop policy if exists document_templates_school_scope on document_templates;
create policy document_templates_school_scope on document_templates for all
  using (school_id = current_school_id() or current_role_name() = 'super_admin')
  with check (school_id = current_school_id() or current_role_name() = 'super_admin');

drop policy if exists generated_documents_school_scope on generated_documents;
create policy generated_documents_school_scope on generated_documents for all
  using (school_id = current_school_id() or current_role_name() = 'super_admin')
  with check (school_id = current_school_id() or current_role_name() = 'super_admin');

-- ----------------------------------------------------------------------------
-- Storage buckets - private, school-scoped via the `<school_id>/...` path
-- prefix enforced in storage.objects policies below.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('document-templates', 'document-templates', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('generated-documents', 'generated-documents', false)
on conflict (id) do nothing;

drop policy if exists document_templates_storage_scope on storage.objects;
create policy document_templates_storage_scope on storage.objects for all
  using (
    bucket_id = 'document-templates'
    and ((storage.foldername(name))[1] = current_school_id()::text or current_role_name() = 'super_admin')
  )
  with check (
    bucket_id = 'document-templates'
    and ((storage.foldername(name))[1] = current_school_id()::text or current_role_name() = 'super_admin')
  );

drop policy if exists generated_documents_storage_scope on storage.objects;
create policy generated_documents_storage_scope on storage.objects for all
  using (
    bucket_id = 'generated-documents'
    and ((storage.foldername(name))[1] = current_school_id()::text or current_role_name() = 'super_admin')
  )
  with check (
    bucket_id = 'generated-documents'
    and ((storage.foldername(name))[1] = current_school_id()::text or current_role_name() = 'super_admin')
  );
