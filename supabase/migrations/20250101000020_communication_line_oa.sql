-- ============================================================================
-- 0020: Module 11 - Parent Communication & LINE OA System
--
-- IMPORTANT SANDBOX NOTE: There is no real LINE Developers channel/secret
-- or webhook configured in this environment. Everything described below as
-- "LINE OA" is SIMULATED: line_users models the data shape of a LINE OA
-- account-link (line_user_id, verification workflow) but the "scan QR /
-- LINE Login" step is a web form that simulates the callback a real LINE
-- Login flow would produce. Outbound "LINE push" is simulated by a single
-- adapter function (sendLineMessage() in src/lib/queries/communication.ts)
-- that writes a communication_logs row with status 'simulated' instead of
-- making any real HTTP call. Swapping that one function for a real LINE
-- Messaging API call is the only change needed to go live later.
--
-- Reuses (does NOT duplicate):
--   - announcements (0008): the existing broadcast table from
--     src/app/(dashboard)/communication/page.tsx is kept and extended in
--     place (category/scheduling/attachment/target columns) rather than
--     replaced. announcement_recipients (new) tracks per-recipient
--     delivery/read/ack status, which the existing table never had.
--   - notifications (0008, extended 0010 with priority/category): reused
--     AS-IS as the recipient-facing in-app inbox for every notification
--     trigger in this module (attendance/academic/behavior/event/survey/
--     document). Only a new `channel` column is added (in_app default,
--     simulated_line, email-stub, sms-stub) so the notification center can
--     show which channel a row represents. This is the SAME table already
--     written to by Modules 1/3/4/7/10 - no parallel table created.
--   - parents (0002/0011): parents.student_id is already a direct FK to
--     students (one parent row per parent-student relationship, not a
--     M:N join table) - so "parent_student_links" from the spec is NOT
--     created. line_users below links to parents.id directly and is the
--     only genuinely new linking concept (the LINE-specific identity).
--   - assignments (0005, Module 5 Academic): "Homework Communication" is
--     built as a notification-trigger layer over this existing table
--     (notifyAssignmentCreated/notifyMissingSubmissions in
--     communication.ts) - no new homework table.
--   - behavior notifications (behavior.ts, Module 4): recordBehaviorPoints
--     already inserts notifications rows for points awarded/deducted and
--     for level-ups. Not duplicated; the Smart Notification Engine here
--     only adds the *new* behavior-adjacent triggers the spec asks for
--     that Module 4 doesn't already cover (none needed - level_up/behavior
--     categories already exist, reused as-is by the analytics queries).
--   - Module 9 home_visits / student welfare data (0018): kept STAFF-ONLY
--     per Module 9's deliberate decision. The Parent Portal page in this
--     module does NOT surface home-visit/case/welfare details to parents -
--     see final report for this documented spec conflict (spec asks for
--     "home-visit-reports" in the parent-facing aggregation; we do not
--     expose Module 9's sensitive case-management data to parents).
--   - Module 10 sdq_scores (0019): already has parent_select RLS; the
--     Parent Portal page links to it as-is.
--   - export-buttons.tsx (CsvExportButton/PrintButton): reused for Survey
--     System report generation, not rebuilt.
--
-- Genuinely NEW tables:
--   line_users              - simulated LINE OA account-link per parent.
--   announcement_recipients - per-recipient delivery/read tracking for
--                              announcements (the existing announcements
--                              table never had this).
--   message_threads          - 1:1 / group / broadcast chat threads.
--   messages                 - chat messages within a thread.
--   message_attachments       - file/image URL attachments on a message.
--   notification_templates   - the 8-template Thai message catalog with
--                              {{placeholder}} tokens.
--   events                   - parent meetings/activities/workshops
--     event_rsvps              (named events+event_rsvps, not
--                              "event_invitations" - cleaner shape for an
--                              RSVP-style flow with attendance tracking).
--   parent_surveys            - survey/poll definitions.
--   survey_questions          - questions per survey (so multi-question
--                              surveys/polls are supported, not just a
--                              single free-text field).
--   survey_responses          - one row per respondent per survey
--                              (anonymous option via nullable parent_id).
--   survey_answers             - one row per question per response.
--   communication_logs        - sender-side audit trail: who sent what via
--                              which channel and the resulting status.
--                              Deliberately NOT the same purpose as
--                              `notifications` (recipient inbox).
--   documents (0008) is reused for Document Sharing rather than a new
--   table - extended with target_parent_id/category values and an
--   acknowledged_at column for the acknowledgement-tracking requirement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- notifications: add channel column only (existing table, no new table).
-- ----------------------------------------------------------------------------
alter table notifications add column if not exists channel text not null default 'in_app';
do $$ begin
  alter table notifications add constraint notifications_channel_check
    check (channel in ('in_app', 'simulated_line', 'email_stub', 'sms_stub'));
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- announcements: extend in place (existing table from 0008) with the
-- category/scheduling/attachment/targeting fields the spec asks for.
-- ----------------------------------------------------------------------------
alter table announcements add column if not exists category text not null default 'general';
do $$ begin
  alter table announcements add constraint announcements_category_check
    check (category in ('general', 'school_activity', 'examination', 'meeting', 'homework', 'urgent'));
exception when duplicate_object then null; end $$;

alter table announcements add column if not exists scheduled_at timestamptz;
alter table announcements add column if not exists attachment_urls text[];
alter table announcements add column if not exists target_classrooms text[];
alter table announcements add column if not exists target_parent_ids uuid[];

-- ----------------------------------------------------------------------------
-- line_users: simulated LINE OA account-link, one row per parent who has
-- gone through the (simulated) linking workflow. Verification workflow:
-- pending (code generated) -> verified (parent confirmed via the simulated
-- web form standing in for LINE Login). No real LINE OAuth token is ever
-- stored here.
-- ----------------------------------------------------------------------------
create table if not exists line_users (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  parent_id uuid not null references parents(id) on delete cascade,
  line_user_id text not null,
  display_name text,
  linking_code text not null,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'revoked')),
  notifications_enabled boolean not null default true,
  linked_at timestamptz,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, line_user_id),
  unique (parent_id)
);

create trigger trg_line_users_updated_at before update on line_users for each row execute function set_updated_at();
create index if not exists idx_line_users_parent on line_users(parent_id);
create index if not exists idx_line_users_school on line_users(school_id);

-- ----------------------------------------------------------------------------
-- announcement_recipients: per-recipient delivery/read/ack tracking for an
-- announcement (the existing announcements table is broadcast-only with no
-- per-recipient state).
-- ----------------------------------------------------------------------------
create table if not exists announcement_recipients (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  announcement_id uuid not null references announcements(id) on delete cascade,
  parent_id uuid references parents(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued', 'simulated', 'delivered', 'failed')),
  read_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_announcement_recipients_announcement on announcement_recipients(announcement_id);
create index if not exists idx_announcement_recipients_parent on announcement_recipients(parent_id);

-- ----------------------------------------------------------------------------
-- message_threads / messages / message_attachments: Parent-Teacher Chat
-- (1:1, class group, broadcast). Genuinely new - no prior module has chat.
-- ----------------------------------------------------------------------------
create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  thread_type text not null default 'direct'
    check (thread_type in ('direct', 'class_group', 'broadcast')),
  title text,
  classroom text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists message_thread_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  parent_id uuid references parents(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (thread_id, user_id, parent_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_user_id uuid references users(id) on delete set null,
  sender_parent_id uuid references parents(id) on delete set null,
  body text not null,
  is_quick_reply boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  file_url text not null,
  file_type text not null default 'file' check (file_type in ('image', 'file')),
  file_name text,
  created_at timestamptz not null default now()
);

create table if not exists message_read_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  parent_id uuid references parents(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (message_id, user_id, parent_id)
);

create trigger trg_message_threads_updated_at before update on message_threads for each row execute function set_updated_at();
create index if not exists idx_messages_thread on messages(thread_id, created_at);
create index if not exists idx_thread_participants_thread on message_thread_participants(thread_id);
create index if not exists idx_thread_participants_user on message_thread_participants(user_id);
create index if not exists idx_thread_participants_parent on message_thread_participants(parent_id);

-- ----------------------------------------------------------------------------
-- notification_templates: catalog for Message Templates feature, Thai text
-- with {{placeholder}} tokens, seeded with the 8 spec'd types.
-- ----------------------------------------------------------------------------
create table if not exists notification_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  template_type text not null check (template_type in (
    'attendance_alert', 'late_arrival', 'homework_reminder', 'exam_announcement',
    'behavior_update', 'parent_meeting_invitation', 'emergency_notice', 'custom'
  )),
  title text not null,
  body_template text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_notification_templates_updated_at before update on notification_templates for each row execute function set_updated_at();
create index if not exists idx_notification_templates_type on notification_templates(template_type);

insert into notification_templates (school_id, template_type, title, body_template) values
  (null, 'attendance_alert', 'แจ้งเตือนการมาเรียน', 'นักเรียน {{student_name}} มาเรียนแล้ว เวลา {{time}} น.'),
  (null, 'late_arrival', 'แจ้งเตือนมาสาย', 'นักเรียน {{student_name}} มาเรียนสาย เวลา {{time}} น. กรุณาตรวจสอบ'),
  (null, 'homework_reminder', 'แจ้งเตือนการบ้าน', 'การบ้านวิชา {{subject}} เรื่อง "{{assignment_title}}" กำหนดส่ง {{due_date}} กรุณาติดตามบุตรหลานของท่าน'),
  (null, 'exam_announcement', 'แจ้งกำหนดการสอบ', 'แจ้งกำหนดสอบวิชา {{subject}} วันที่ {{exam_date}} กรุณาเตรียมความพร้อมให้บุตรหลานของท่าน'),
  (null, 'behavior_update', 'รายงานพฤติกรรม', 'รายงานพฤติกรรมของ {{student_name}}: {{behavior_detail}}'),
  (null, 'parent_meeting_invitation', 'เชิญประชุมผู้ปกครอง', 'ขอเชิญท่านผู้ปกครองของ {{student_name}} เข้าร่วมประชุมในวันที่ {{meeting_date}} เวลา {{meeting_time}} น. ณ {{location}}'),
  (null, 'emergency_notice', 'ประกาศฉุกเฉิน', 'ประกาศฉุกเฉิน: {{message}} กรุณาติดต่อโรงเรียนทันทีหากมีข้อสงสัย'),
  (null, 'custom', 'ข้อความทั่วไป', '{{message}}')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- events / event_rsvps: parent meetings, school activities, events,
-- workshops with RSVP + attendance tracking. Reminder notifications reuse
-- the shared `notifications` table, no new reminder table.
-- ----------------------------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  title text not null,
  description text,
  event_category text not null default 'school_activity'
    check (event_category in ('parent_meeting', 'school_activity', 'event', 'workshop')),
  classroom text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_rsvps (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  parent_id uuid references parents(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending', 'attending', 'declined', 'maybe')),
  attended boolean,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, parent_id, user_id)
);

create trigger trg_events_updated_at before update on events for each row execute function set_updated_at();
create index if not exists idx_events_school on events(school_id, starts_at);
create index if not exists idx_event_rsvps_event on event_rsvps(event_id);

-- ----------------------------------------------------------------------------
-- parent_surveys / survey_questions / survey_responses / survey_answers:
-- Survey System (satisfaction surveys, feedback, polls, voting), anonymous
-- option via nullable parent_id on survey_responses.
-- ----------------------------------------------------------------------------
create table if not exists parent_surveys (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  title text not null,
  description text,
  survey_type text not null default 'feedback'
    check (survey_type in ('satisfaction', 'feedback', 'poll', 'vote')),
  is_anonymous boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references parent_surveys(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'rating' check (question_type in ('rating', 'single_choice', 'multiple_choice', 'text')),
  options jsonb,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  survey_id uuid not null references parent_surveys(id) on delete cascade,
  parent_id uuid references parents(id) on delete set null,
  submitted_at timestamptz not null default now()
);

create table if not exists survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references survey_responses(id) on delete cascade,
  question_id uuid not null references survey_questions(id) on delete cascade,
  answer_value text,
  created_at timestamptz not null default now()
);

create trigger trg_parent_surveys_updated_at before update on parent_surveys for each row execute function set_updated_at();
create index if not exists idx_survey_questions_survey on survey_questions(survey_id);
create index if not exists idx_survey_responses_survey on survey_responses(survey_id);
create index if not exists idx_survey_answers_response on survey_answers(response_id);

-- ----------------------------------------------------------------------------
-- documents (0008): extend in place for Document Sharing rather than a
-- new table - report cards/certificates/home-visit-reports/school-letters/
-- permission-forms are already generated elsewhere; this only adds the
-- parent-targeting + acknowledgement-tracking columns needed to "share" an
-- existing document with a parent. Digital signature is explicitly
-- out of scope (no real cryptographic signing) - acknowledged_at is a
-- simple timestamp, not a signature.
-- ----------------------------------------------------------------------------
alter table documents add column if not exists shared_with_parent_id uuid references parents(id) on delete set null;
alter table documents add column if not exists acknowledged_at timestamptz;
create index if not exists idx_documents_shared_parent on documents(shared_with_parent_id);

-- ----------------------------------------------------------------------------
-- communication_logs: sender-side audit trail (who sent what via which
-- channel and the resulting status). Distinct purpose from `notifications`
-- (recipient inbox) - kept minimal per the scoping note.
-- ----------------------------------------------------------------------------
create table if not exists communication_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  channel text not null check (channel in ('in_app', 'simulated_line', 'email_stub', 'sms_stub')),
  message_type text not null check (message_type in (
    'announcement', 'message', 'notification', 'event_reminder', 'survey_invite', 'document_share'
  )),
  recipient_parent_id uuid references parents(id) on delete set null,
  recipient_user_id uuid references users(id) on delete set null,
  reference_table text,
  reference_id uuid,
  status text not null default 'queued' check (status in ('queued', 'simulated', 'delivered', 'failed')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_communication_logs_school on communication_logs(school_id, created_at desc);
create index if not exists idx_communication_logs_parent on communication_logs(recipient_parent_id);
create index if not exists idx_communication_logs_channel on communication_logs(channel);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table line_users enable row level security;
alter table announcement_recipients enable row level security;
alter table message_threads enable row level security;
alter table message_thread_participants enable row level security;
alter table messages enable row level security;
alter table message_attachments enable row level security;
alter table message_read_receipts enable row level security;
alter table notification_templates enable row level security;
alter table events enable row level security;
alter table event_rsvps enable row level security;
alter table parent_surveys enable row level security;
alter table survey_questions enable row level security;
alter table survey_responses enable row level security;
alter table survey_answers enable row level security;
alter table communication_logs enable row level security;

-- line_users
do $$ begin create policy line_users_super_admin_all on line_users for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy line_users_admin_manage on line_users for all using (current_role_name() = 'school_admin' and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy line_users_teacher_select on line_users for select using (current_role_name() = 'teacher' and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin
  create policy line_users_parent_manage on line_users for all using (
    current_role_name() = 'parent' and parent_id in (select id from parents where parents.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- announcement_recipients
do $$ begin create policy announcement_recipients_super_admin_all on announcement_recipients for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy announcement_recipients_admin_manage on announcement_recipients for all using (current_role_name() = 'school_admin' and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy announcement_recipients_teacher_manage on announcement_recipients for all using (current_role_name() = 'teacher' and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin
  create policy announcement_recipients_parent_select on announcement_recipients for select using (
    current_role_name() = 'parent' and parent_id in (select id from parents where parents.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy announcement_recipients_parent_update on announcement_recipients for update using (
    current_role_name() = 'parent' and parent_id in (select id from parents where parents.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- message_threads / participants / messages / attachments / receipts:
-- scoped so a parent/teacher only sees threads they participate in.
do $$ begin create policy message_threads_super_admin_all on message_threads for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy message_threads_admin_manage on message_threads for all using (current_role_name() = 'school_admin' and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin
  create policy message_threads_participant_select on message_threads for all using (
    exists (
      select 1 from message_thread_participants p
      where p.thread_id = message_threads.id
        and (p.user_id = auth.uid() or p.parent_id in (select id from parents where parents.user_id = auth.uid()))
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin create policy thread_participants_super_admin_all on message_thread_participants for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy thread_participants_admin_manage on message_thread_participants for all using (current_role_name() in ('school_admin', 'teacher')); exception when duplicate_object then null; end $$;
do $$ begin
  create policy thread_participants_self_select on message_thread_participants for select using (
    user_id = auth.uid() or parent_id in (select id from parents where parents.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin create policy messages_super_admin_all on messages for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin
  create policy messages_participant_all on messages for all using (
    exists (
      select 1 from message_thread_participants p
      where p.thread_id = messages.thread_id
        and (p.user_id = auth.uid() or p.parent_id in (select id from parents where parents.user_id = auth.uid()))
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin create policy message_attachments_super_admin_all on message_attachments for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin
  create policy message_attachments_participant_all on message_attachments for all using (
    exists (
      select 1 from messages m join message_thread_participants p on p.thread_id = m.thread_id
      where m.id = message_attachments.message_id
        and (p.user_id = auth.uid() or p.parent_id in (select id from parents where parents.user_id = auth.uid()))
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin create policy message_read_receipts_super_admin_all on message_read_receipts for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin
  create policy message_read_receipts_self_all on message_read_receipts for all using (
    user_id = auth.uid() or parent_id in (select id from parents where parents.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- notification_templates: global catalog, readable by all signed-in users,
-- managed by admins.
do $$ begin create policy notification_templates_select_all on notification_templates for select using (auth.uid() is not null); exception when duplicate_object then null; end $$;
do $$ begin create policy notification_templates_super_admin_all on notification_templates for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy notification_templates_admin_manage on notification_templates for all using (current_role_name() = 'school_admin' and (school_id is null or school_id = current_school_id())); exception when duplicate_object then null; end $$;

-- events / event_rsvps
do $$ begin create policy events_super_admin_all on events for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy events_admin_teacher_manage on events for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy events_school_select on events for select using (school_id = current_school_id()); exception when duplicate_object then null; end $$;

do $$ begin create policy event_rsvps_super_admin_all on event_rsvps for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy event_rsvps_admin_teacher_manage on event_rsvps for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin
  create policy event_rsvps_parent_manage on event_rsvps for all using (
    current_role_name() = 'parent' and parent_id in (select id from parents where parents.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- parent_surveys / survey_questions / survey_responses / survey_answers
do $$ begin create policy parent_surveys_super_admin_all on parent_surveys for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy parent_surveys_admin_teacher_manage on parent_surveys for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy parent_surveys_parent_select on parent_surveys for select using (current_role_name() = 'parent' and school_id = current_school_id() and status = 'open'); exception when duplicate_object then null; end $$;

do $$ begin create policy survey_questions_super_admin_all on survey_questions for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin
  create policy survey_questions_admin_teacher_manage on survey_questions for all using (
    current_role_name() in ('school_admin', 'teacher') and exists (select 1 from parent_surveys s where s.id = survey_id and s.school_id = current_school_id())
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy survey_questions_parent_select on survey_questions for select using (
    current_role_name() = 'parent' and exists (select 1 from parent_surveys s where s.id = survey_id and s.school_id = current_school_id() and s.status = 'open')
  );
exception when duplicate_object then null; end $$;

do $$ begin create policy survey_responses_super_admin_all on survey_responses for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy survey_responses_admin_teacher_select on survey_responses for select using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin
  create policy survey_responses_parent_insert on survey_responses for insert with check (
    current_role_name() = 'parent' and school_id = current_school_id()
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy survey_responses_parent_select on survey_responses for select using (
    current_role_name() = 'parent' and parent_id in (select id from parents where parents.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin create policy survey_answers_super_admin_all on survey_answers for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin
  create policy survey_answers_admin_teacher_select on survey_answers for select using (
    current_role_name() in ('school_admin', 'teacher') and exists (
      select 1 from survey_responses r where r.id = response_id and r.school_id = current_school_id()
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy survey_answers_parent_insert on survey_answers for insert with check (
    current_role_name() = 'parent' and exists (
      select 1 from survey_responses r where r.id = response_id and r.parent_id in (select id from parents where parents.user_id = auth.uid())
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy survey_answers_parent_select on survey_answers for select using (
    current_role_name() = 'parent' and exists (
      select 1 from survey_responses r where r.id = response_id and r.parent_id in (select id from parents where parents.user_id = auth.uid())
    )
  );
exception when duplicate_object then null; end $$;

-- communication_logs: sender-side audit trail, staff-only (admin/teacher
-- who sent things) plus super_admin; parents do not need to read this.
do $$ begin create policy communication_logs_super_admin_all on communication_logs for all using (current_role_name() = 'super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy communication_logs_admin_select on communication_logs for select using (current_role_name() = 'school_admin' and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy communication_logs_teacher_select on communication_logs for select using (current_role_name() = 'teacher' and school_id = current_school_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy communication_logs_insert_staff on communication_logs for insert with check (current_role_name() in ('school_admin', 'teacher', 'super_admin') and school_id = current_school_id()); exception when duplicate_object then null; end $$;
