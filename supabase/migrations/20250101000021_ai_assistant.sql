-- ============================================================================
-- 0021: Module 12 - AI Teacher Assistant (Claude-powered)
--
-- IMPORTANT SANDBOX NOTE: This module wires a REAL Anthropic Claude API
-- integration (src/lib/ai/client.ts), unlike every prior module's "AI"
-- features (which are deterministic, rule-based Thai-text generators with
-- zero external calls - see getAiBehaviorAnalysis, getAiRiskScore,
-- getAiHomeVisitAnalysis, etc. in src/lib/queries/*.ts, all kept as-is).
-- There is NO ANTHROPIC_API_KEY configured in this sandbox; every code path
-- that would call the Claude API checks for the key first and returns a
-- typed "not configured" result instead of throwing - see
-- src/lib/ai/client.ts. Set ANTHROPIC_API_KEY in your environment to make
-- this module functional.
--
-- Tables (deliberately consolidated - see report for full reasoning):
--   ai_conversations  - one row per chat thread (per user).
--   ai_messages       - one row per turn (role=user/assistant/system),
--                       replaces the spec's "ai_requests" - a message *is*
--                       a request/response turn, no need for a separate
--                       table; usage/token counts live here per-turn.
--   ai_generated_content - consolidates the spec's ai_reports / ai_insights
--                       / ai_recommendations / ai_alerts /
--                       ai_generated_documents into ONE table with a
--                       `content_type` discriminator
--                       (insight | recommendation | alert | report |
--                        document | certificate_text | message_draft |
--                        lesson_plan | workflow_run). Reduces 5+ overlapping
--                       tables to one, matching this app's established
--                       pattern of reusing `notifications` across 5 prior
--                       modules instead of creating parallel tables.
--   ai_knowledge_base - plain-text policy/document chunks for lexical RAG
--                       (full-text search via to_tsvector), NOT a vector
--                       store - no embeddings column, no pgvector
--                       extension. "Semantic search" in the UI means
--                       Postgres full-text search, documented as a
--                       deliberate simplification.
--   ai_usage_logs     - lightweight per-call usage/cost visibility log
--                       (user, feature, token counts, timestamp). This is
--                       the only genuinely new "audit" table in this
--                       module; full PDPA/compliance logging is out of
--                       scope (see report).
--
-- Explicitly SKIPPED vs the spec (see final report for full list):
--   ai_workflows table (workflows are manually-triggered server functions,
--   not stored/scheduled - results of a "run" are persisted as
--   ai_generated_content rows with content_type='workflow_run').
--   ai_embeddings (no vector store - lexical full-text search only).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ai_conversations: one chat thread per user (Thai-language chat assistant).
-- ----------------------------------------------------------------------------
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  title text not null default 'การสนทนาใหม่',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_idx on ai_conversations(user_id, updated_at desc);
create index if not exists ai_conversations_school_idx on ai_conversations(school_id);

-- ----------------------------------------------------------------------------
-- ai_messages: one row per chat turn (user prompt or assistant reply).
-- ----------------------------------------------------------------------------
create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  input_tokens integer,
  output_tokens integer,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_conversation_idx on ai_messages(conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- ai_generated_content: consolidated insight / recommendation / alert /
-- report / document / certificate-text / message-draft / lesson-plan /
-- workflow-run output. `content_type` is the discriminator.
-- ----------------------------------------------------------------------------
create table if not exists ai_generated_content (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  content_type text not null check (
    content_type in (
      'insight', 'recommendation', 'alert', 'report', 'document',
      'certificate_text', 'message_draft', 'lesson_plan', 'workflow_run'
    )
  ),
  domain text, -- e.g. 'academic' | 'attendance' | 'behavior' | 'health' | 'sdq' | 'home_visit' | 'schoolwide'
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_generated_content_school_idx on ai_generated_content(school_id, content_type, created_at desc);
create index if not exists ai_generated_content_student_idx on ai_generated_content(student_id);

-- ----------------------------------------------------------------------------
-- ai_knowledge_base: plain-text chunks for lexical (full-text search) RAG.
-- No embeddings column - "semantic search" = Postgres to_tsvector/ILIKE.
-- ----------------------------------------------------------------------------
create table if not exists ai_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  category text not null default 'general', -- e.g. 'policy' | 'curriculum' | 'procedure' | 'faq'
  title text not null,
  content text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_knowledge_base_school_idx on ai_knowledge_base(school_id, category);

-- Full-text search index (Thai text falls back to 'simple' tokenization,
-- which still supports useful word/substring matching via to_tsvector).
create index if not exists ai_knowledge_base_fts_idx
  on ai_knowledge_base
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));

-- ----------------------------------------------------------------------------
-- ai_usage_logs: lightweight per-call usage/cost visibility (not a formal
-- compliance/audit framework - see report for what's out of scope).
-- ----------------------------------------------------------------------------
create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  feature text not null, -- e.g. 'chat' | 'analysis' | 'report' | 'certificate' | 'lesson' | 'knowledge_base'
  model text,
  input_tokens integer,
  output_tokens integer,
  succeeded boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_school_idx on ai_usage_logs(school_id, created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at triggers (reuse the existing set_updated_at() helper if present,
-- otherwise define inline to avoid depending on prior-migration internals).
-- ----------------------------------------------------------------------------
create or replace function ai_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ai_conversations_set_updated_at on ai_conversations;
create trigger ai_conversations_set_updated_at
  before update on ai_conversations
  for each row execute function ai_set_updated_at();

drop trigger if exists ai_knowledge_base_set_updated_at on ai_knowledge_base;
create trigger ai_knowledge_base_set_updated_at
  before update on ai_knowledge_base
  for each row execute function ai_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: AI chat/insights are staff-only (teacher/school_admin/super_admin).
-- This sensitive student-analysis module is NOT exposed to parent/student
-- roles by default, matching the home_visits/sdq_assessments precedent in
-- 0009_rls_policies.sql (teacher/admin only - no parent/student policies).
-- ----------------------------------------------------------------------------
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table ai_generated_content enable row level security;
alter table ai_knowledge_base enable row level security;
alter table ai_usage_logs enable row level security;

-- ai_conversations: each staff user sees/manages only their own threads.
do $$ begin
  create policy ai_conversations_super_admin_all on ai_conversations for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ai_conversations_owner_manage on ai_conversations for all using (
    current_role_name() in ('school_admin', 'teacher') and user_id = auth.uid()
  );
exception when duplicate_object then null; end $$;

-- ai_messages: scoped via parent conversation ownership.
do $$ begin
  create policy ai_messages_super_admin_all on ai_messages for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ai_messages_owner_manage on ai_messages for all using (
    current_role_name() in ('school_admin', 'teacher') and exists (
      select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

-- ai_generated_content: staff-only within their school (teacher restricted
-- to their own students via is_my_student when student_id is set).
do $$ begin
  create policy ai_generated_content_super_admin_all on ai_generated_content for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ai_generated_content_admin_manage on ai_generated_content for all using (
    current_role_name() = 'school_admin' and school_id = current_school_id()
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ai_generated_content_teacher_manage on ai_generated_content for all using (
    current_role_name() = 'teacher' and school_id = current_school_id() and (student_id is null or is_my_student(student_id))
  );
exception when duplicate_object then null; end $$;

-- ai_knowledge_base: readable by all staff in the school, managed by admins.
do $$ begin
  create policy ai_knowledge_base_super_admin_all on ai_knowledge_base for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ai_knowledge_base_admin_manage on ai_knowledge_base for all using (
    current_role_name() = 'school_admin' and school_id = current_school_id()
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ai_knowledge_base_teacher_select on ai_knowledge_base for select using (
    current_role_name() = 'teacher' and school_id = current_school_id()
  );
exception when duplicate_object then null; end $$;

-- ai_usage_logs: admin-visible cost/usage dashboard, staff can insert their
-- own usage (the server-side API routes write these with the service/user
-- context), no parent/student access.
do $$ begin
  create policy ai_usage_logs_super_admin_all on ai_usage_logs for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ai_usage_logs_admin_select on ai_usage_logs for select using (
    current_role_name() = 'school_admin' and school_id = current_school_id()
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ai_usage_logs_staff_insert on ai_usage_logs for insert with check (
    current_role_name() in ('school_admin', 'teacher', 'super_admin')
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ai_usage_logs_teacher_select_own on ai_usage_logs for select using (
    current_role_name() = 'teacher' and user_id = auth.uid()
  );
exception when duplicate_object then null; end $$;
