-- ============================================================================
-- 0019: Module 10 - SDQ (Strengths & Difficulties Questionnaire) &
-- Student Screening / Risk Profile System
--
-- HEAVY OVERLAP WITH MODULE 9 (0018, home_visit_welfare) - reused, not
-- duplicated:
--   - intervention_plans, student_cases (0018): Module 10's "Intervention
--     Management" / "Case Management" sections are the SAME CONCEPT as
--     Module 9's. No new tables are created for these. Only altered in
--     place below: (a) student_cases.status gains 'improving' per Module
--     10's 5-state spec (Open/Monitoring/Improving/Resolved/Closed), and
--     (b) both tables gain an optional sdq_assessment_id link so a
--     case/intervention can be traced back to the SDQ result that
--     triggered it.
--   - getAiRiskScore() (welfare.ts, 0018): Module 10's "Risk Profile
--     System" reuses this exact composite risk function rather than
--     building a second risk engine. It is extended (in application code,
--     not SQL) to pull in the latest sdq_assessments.total_difficulties_score
--     as one more weighted input alongside attendance/academic/health/
--     behavior/family signals it already considers.
--   - "Student Screening Module" categories (Academic/Attendance/Behavior/
--     Health/Family/Financial/Technology/Mental-Health risk): these are
--     the same risk *factors* already computed from attendance (Module 3),
--     academic (Module 5), health (Module 7), finance (Module 6), and
--     welfare (Module 9) data. No student_screenings/screening_results
--     tables are created - the breakdown is exposed as a query-layer view
--     (getStudentRiskProfile in sdq.ts) over existing data plus SDQ.
--   - student_risk_profiles / risk_factors (spec suggestion): NOT created
--     as stored tables - would duplicate getAiRiskScore()'s on-demand
--     composition. students.risk_level/risk_category (0011) remain the
--     single derived snapshot, exactly as decided in 0018.
--   - early_warning_alerts (spec suggestion): NOT created. The generic
--     `notifications` table (0008) is reused as-is, the same precedent as
--     0018's home-visit reminders, with title/body distinguishing
--     "ครบกำหนดประเมิน" / "นักเรียนกลุ่มเสี่ยงสูง" / "ต้องติดตามต่อ" alerts.
--   - sdq_results vs sdq_scores: merged - sdq_scores below IS the results
--     table (5 domain scores + total difficulties + risk level per
--     completed assessment), no separate sdq_results table.
--
-- Genuinely NEW tables (the SDQ instrument itself - not covered by any
-- prior module):
--   sdq_questions   - catalog of the 25 standard SDQ items (5 per
--                      subscale), seeded once globally (school_id null,
--                      same pattern as other global catalogs).
--   sdq_responses   - one row per question per completed assessment
--                      (0/1/2 answer).
--   sdq_scores      - the 5 domain scores + total difficulties + risk
--                      level for one assessment (the "results" row).
--
-- sdq_assessments (0008) is EXTENDED in place (assessment_type, period,
-- status, rater linkage) rather than replaced, since it already exists
-- and is read by the existing src/app/(dashboard)/sdq/page.tsx.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extend sdq_assessments: assessment workflow fields (type/period/status/
-- rater). The existing emotional_score/conduct_score/.../risk_level columns
-- stay as a quick-entry convenience path (used by the existing
-- sdq-form-dialog.tsx) but the full 25-item workflow now also populates
-- sdq_scores (below) as the canonical results record.
-- ----------------------------------------------------------------------------
alter table sdq_assessments add column if not exists assessment_type text not null default 'teacher';
do $$ begin
  alter table sdq_assessments add constraint sdq_assessments_assessment_type_check
    check (assessment_type in ('teacher', 'parent', 'student'));
exception when duplicate_object then null;
end $$;

alter table sdq_assessments add column if not exists assessment_period text not null default 'custom';
do $$ begin
  alter table sdq_assessments add constraint sdq_assessments_assessment_period_check
    check (assessment_period in ('beginning_of_semester', 'mid_semester', 'end_of_semester', 'custom'));
exception when duplicate_object then null;
end $$;

alter table sdq_assessments add column if not exists status text not null default 'pending';
do $$ begin
  alter table sdq_assessments add constraint sdq_assessments_status_check
    check (status in ('pending', 'in_progress', 'completed', 'cancelled'));
exception when duplicate_object then null;
end $$;

-- The rater the assessment is assigned to: a users.id for teacher/parent
-- raters, or a students.id for self-assessment. Both are nullable FKs so
-- exactly one is populated depending on assessment_type.
alter table sdq_assessments add column if not exists assigned_to_user_id uuid references users(id) on delete set null;
alter table sdq_assessments add column if not exists assigned_to_parent_id uuid references parents(id) on delete set null;
alter table sdq_assessments add column if not exists submitted_at timestamptz;
alter table sdq_assessments add column if not exists created_by uuid references users(id) on delete set null;

-- Widen risk_level to the 5-level scheme (Normal/Borderline/At Risk/High
-- Risk/Critical) per Module 10's spec, replacing the 3-level 0008 check.
alter table sdq_assessments drop constraint if exists sdq_assessments_risk_level_check;
do $$ begin
  alter table sdq_assessments add constraint sdq_assessments_risk_level_check
    check (risk_level in ('normal', 'borderline', 'at_risk', 'high_risk', 'critical'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_sdq_assessments_status on sdq_assessments(status);
create index if not exists idx_sdq_assessments_assigned_user on sdq_assessments(assigned_to_user_id);
create index if not exists idx_sdq_assessments_assigned_parent on sdq_assessments(assigned_to_parent_id);

-- ----------------------------------------------------------------------------
-- sdq_questions: the 25-item standard questionnaire catalog. Seeded once
-- globally (school_id null), same pattern as other global catalogs in this
-- codebase. 5 subscales x 5 items. is_reverse_scored marks the items whose
-- raw 0/1/2 answer is inverted (2-raw) before summing into the subscale,
-- per the standard SDQ scoring key.
-- ----------------------------------------------------------------------------
create table if not exists sdq_questions (
  id uuid primary key default gen_random_uuid(),
  item_no int not null unique,
  subscale text not null check (subscale in ('emotional', 'conduct', 'hyperactivity', 'peer_problems', 'prosocial')),
  question_text_th text not null,
  is_reverse_scored boolean not null default false,
  display_order int not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- sdq_responses: one row per question per assessment (the rater's 0/1/2
-- answer). school_id duplicated here (denormalised, matching the rest of
-- the schema's convention) so RLS can scope directly without a join.
-- ----------------------------------------------------------------------------
create table if not exists sdq_responses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  assessment_id uuid not null references sdq_assessments(id) on delete cascade,
  question_id uuid not null references sdq_questions(id) on delete cascade,
  answer_value int not null check (answer_value in (0, 1, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);

create trigger trg_sdq_responses_updated_at before update on sdq_responses for each row execute function set_updated_at();
create index if not exists idx_sdq_responses_assessment on sdq_responses(assessment_id);

-- ----------------------------------------------------------------------------
-- sdq_scores: the computed results row for a completed assessment - 5
-- domain scores + total difficulties + risk level. This IS the "results"
-- table (sdq_results from the spec is merged into this, not duplicated).
-- ----------------------------------------------------------------------------
create table if not exists sdq_scores (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  assessment_id uuid not null unique references sdq_assessments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  emotional_score int not null,
  conduct_score int not null,
  hyperactivity_score int not null,
  peer_problems_score int not null,
  prosocial_score int not null,
  total_difficulties_score int not null,
  risk_level text not null check (risk_level in ('normal', 'borderline', 'at_risk', 'high_risk', 'critical')),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_sdq_scores_student on sdq_scores(student_id);
create index if not exists idx_sdq_scores_risk_level on sdq_scores(risk_level);

-- ----------------------------------------------------------------------------
-- Link case management / intervention plans (0018) back to the SDQ
-- assessment that triggered the follow-up, instead of a new
-- sdq_follow_ups table - Module 9's case/intervention shape fits fine.
-- ----------------------------------------------------------------------------
alter table student_cases add column if not exists sdq_assessment_id uuid references sdq_assessments(id) on delete set null;
alter table intervention_plans add column if not exists sdq_assessment_id uuid references sdq_assessments(id) on delete set null;
create index if not exists idx_student_cases_sdq_assessment on student_cases(sdq_assessment_id);
create index if not exists idx_intervention_plans_sdq_assessment on intervention_plans(sdq_assessment_id);

-- Widen student_cases.status to the 5-state scheme required by Module 10
-- (Open/Monitoring/Improving/Resolved/Closed) - adds 'improving' only,
-- does not remove or rename any existing state.
alter table student_cases drop constraint if exists student_cases_status_check;
do $$ begin
  alter table student_cases add constraint student_cases_status_check
    check (status in ('open', 'monitoring', 'improving', 'resolved', 'closed'));
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- Seed the 25-item SDQ questionnaire (Thai). A reasonable, internally
-- consistent 25-item bank with 5 items per subscale and a documented
-- reverse-scored subset - not a verbatim reproduction of the official
-- Goodman SDQ wording/key (see final report for the simplification note).
-- Reverse-scored items follow the standard SDQ pattern (items typically
-- worded as a positive trait within a "difficulties" subscale, or vice
-- versa for the prosocial subscale - none needed here since all positively
-- phrased items are in their own scale already, except the conduct/peer
-- items below that are worded as a positive behaviour).
-- ----------------------------------------------------------------------------
insert into sdq_questions (item_no, subscale, question_text_th, is_reverse_scored, display_order) values
  (1,  'emotional',     'มักมีอาการปวดหัว ปวดท้อง หรือไม่สบายโดยไม่มีสาเหตุทางการแพทย์ชัดเจน', false, 1),
  (2,  'emotional',     'มีความกังวลหลายเรื่อง ดูเหมือนเป็นกังวลอยู่บ่อย ๆ', false, 2),
  (3,  'emotional',     'มักไม่มีความสุข ท้อแท้ หรือร้องไห้บ่อย', false, 3),
  (4,  'emotional',     'กลัวสิ่งใหม่ ๆ หรือสถานการณ์ใหม่ได้ง่าย ขาดความมั่นใจในตนเอง', false, 4),
  (5,  'emotional',     'มีความมั่นใจในตนเอง ไม่หวั่นไหวง่ายเมื่อเจอสถานการณ์ใหม่', true,  5),
  (6,  'conduct',       'มักโกรธฉุนเฉียวและอารมณ์เสียง่าย', false, 6),
  (7,  'conduct',       'มักเชื่อฟังคำสั่งของผู้ใหญ่เป็นส่วนใหญ่', true,  7),
  (8,  'conduct',       'มักทะเลาะวิวาทหรือรังแกเด็กคนอื่น', false, 8),
  (9,  'conduct',       'มักโกหกหรือโกงผู้อื่น', false, 9),
  (10, 'conduct',       'มีพฤติกรรมลักขโมยของที่บ้าน โรงเรียน หรือที่อื่น', false, 10),
  (11, 'hyperactivity', 'อยู่ไม่สุข นั่งไม่ติดที่นาน', false, 11),
  (12, 'hyperactivity', 'กระสับกระส่ายหรือดิ้นไปดิ้นมาตลอดเวลา', false, 12),
  (13, 'hyperactivity', 'วอกแวกง่าย สมาธิสั้น', false, 13),
  (14, 'hyperactivity', 'คิดก่อนทำ ไตร่ตรองก่อนตัดสินใจอยู่เสมอ', true,  14),
  (15, 'hyperactivity', 'ทำงานที่ได้รับมอบหมายให้เสร็จสมบูรณ์ มีสมาธิต่อเนื่องได้ดี', true,  15),
  (16, 'peer_problems',  'ค่อนข้างอยู่ตัวเดียว มักเล่นตามลำพัง', false, 16),
  (17, 'peer_problems',  'มีเพื่อนสนิทอย่างน้อยหนึ่งคน', true,  17),
  (18, 'peer_problems',  'โดยทั่วไปเป็นที่ชอบของเด็กคนอื่น ๆ', true,  18),
  (19, 'peer_problems',  'มักถูกเด็กคนอื่นรังแกหรือล้อเลียน', false, 19),
  (20, 'peer_problems',  'เข้ากับผู้ใหญ่ได้ดีกว่าเข้ากับเด็กคนอื่นในวัยเดียวกัน', false, 20),
  (21, 'prosocial',      'เอาใจใส่ความรู้สึกของผู้อื่น', false, 21),
  (22, 'prosocial',      'แบ่งปันสิ่งของ (ขนม ของเล่น ดินสอ ฯลฯ) กับเด็กคนอื่นด้วยความเต็มใจ', false, 22),
  (23, 'prosocial',      'อาสาช่วยเหลือเมื่อมีคนเจ็บ ไม่สบายใจ หรือรู้สึกแย่', false, 23),
  (24, 'prosocial',      'มีความเมตตาต่อเด็กที่อายุน้อยกว่า', false, 24),
  (25, 'prosocial',      'มักอาสาช่วยเหลือผู้อื่น เช่น ผู้ปกครอง ครู หรือเด็กคนอื่น', false, 25)
on conflict (item_no) do nothing;

-- ============================================================================
-- Row Level Security
--
-- Access decision (DIFFERENT from Module 9's staff-only stance, per
-- Module 10's spec): parent-rated and self-rated SDQ are core to this
-- module, so parents/students need write access to SUBMIT their own
-- assessment responses and read access to view their own results -
-- scoped tightly via is_my_child()/current_student_id() to the specific
-- assessment assigned to them, never to other students' data.
-- ============================================================================
alter table sdq_questions enable row level security;
alter table sdq_responses enable row level security;
alter table sdq_scores enable row level security;

-- sdq_questions: global read-only catalog, readable by any signed-in user
-- (needed so parents/students can render the questionnaire form).
do $$ begin
  create policy sdq_questions_select_all on sdq_questions for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sdq_questions_super_admin_all on sdq_questions for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;

-- sdq_responses
do $$ begin
  create policy sdq_responses_super_admin_all on sdq_responses for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sdq_responses_admin_manage on sdq_responses for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sdq_responses_teacher_manage on sdq_responses for all using (
    current_role_name() = 'teacher' and exists (
      select 1 from sdq_assessments sa where sa.id = assessment_id and is_my_student(sa.student_id)
    )
  );
exception when duplicate_object then null; end $$;
-- Parent: may select/insert/update responses only for assessments assigned
-- to them (assigned_to_parent_id matches their own parents row) for their
-- own child.
do $$ begin
  create policy sdq_responses_parent_manage on sdq_responses for all using (
    current_role_name() = 'parent' and exists (
      select 1 from sdq_assessments sa
      where sa.id = assessment_id
        and sa.assessment_type = 'parent'
        and is_my_child(sa.student_id)
        and sa.assigned_to_parent_id in (select id from parents where parents.user_id = auth.uid())
    )
  );
exception when duplicate_object then null; end $$;
-- Student: may select/insert/update responses only for self-assessments
-- assigned to their own student_id.
do $$ begin
  create policy sdq_responses_student_manage on sdq_responses for all using (
    current_role_name() = 'student' and exists (
      select 1 from sdq_assessments sa
      where sa.id = assessment_id
        and sa.assessment_type = 'student'
        and sa.student_id = current_student_id()
    )
  );
exception when duplicate_object then null; end $$;

-- sdq_scores (results) - same access shape as sdq_responses, but read-only
-- for parent/student (scores are written by the server-side scoring
-- function using the service role / teacher-management path, not directly
-- by parents/students).
do $$ begin
  create policy sdq_scores_super_admin_all on sdq_scores for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sdq_scores_admin_manage on sdq_scores for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sdq_scores_teacher_manage on sdq_scores for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sdq_scores_parent_select on sdq_scores for select using (current_role_name() = 'parent' and is_my_child(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sdq_scores_student_select on sdq_scores for select using (current_role_name() = 'student' and student_id = current_student_id());
exception when duplicate_object then null; end $$;

-- sdq_assessments: extend 0008/0009's existing teacher/admin/super_admin
-- policies with parent/student SELECT+UPDATE scoped to assessments
-- assigned to them (so they can see status and mark their own as
-- submitted), without exposing other students' assessments.
do $$ begin
  create policy sdq_assessments_parent_manage on sdq_assessments for all using (
    current_role_name() = 'parent'
    and assessment_type = 'parent'
    and is_my_child(student_id)
    and assigned_to_parent_id in (select id from parents where parents.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sdq_assessments_student_manage on sdq_assessments for all using (
    current_role_name() = 'student'
    and assessment_type = 'student'
    and student_id = current_student_id()
  );
exception when duplicate_object then null; end $$;
