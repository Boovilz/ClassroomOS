-- ============================================================================
-- 0013: Behavior & Gamification v2 - categories catalog, quests, reward
-- redemption history. Reuses existing behavior_records/xp_transactions/
-- coin_transactions/achievements/student_achievements/reward_shop_items
-- rather than duplicating them; level is derived from students.xp via
-- src/lib/gamification/levels.ts, not stored.
-- ============================================================================

alter table behavior_records add column if not exists evidence_url text;
alter table students add column if not exists behavior_score int not null default 100;
do $$ begin
  alter table students add constraint students_behavior_score_range check (behavior_score >= 0 and behavior_score <= 200);
exception when duplicate_object then null;
end $$;

create table if not exists behavior_categories (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  category text not null check (category in ('positive', 'negative')),
  title text not null,
  points int not null,
  created_at timestamptz not null default now()
);

create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  period text not null check (period in ('daily', 'weekly', 'monthly')),
  title text not null,
  description text,
  target_count int not null default 1,
  xp_reward int not null default 0,
  coin_reward int not null default 0,
  badge_id uuid references achievements(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists student_quests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  quest_id uuid not null references quests(id) on delete cascade,
  progress_count int not null default 0,
  completed_at timestamptz,
  period_start date not null default current_date,
  created_at timestamptz not null default now(),
  unique (student_id, quest_id, period_start)
);

create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  reward_item_id uuid not null references reward_shop_items(id) on delete cascade,
  coin_transaction_id uuid references coin_transactions(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  redeemed_at timestamptz not null default now()
);

create index if not exists idx_behavior_categories_school on behavior_categories(school_id);
create index if not exists idx_quests_school on quests(school_id);
create index if not exists idx_student_quests_student on student_quests(student_id);
create index if not exists idx_reward_redemptions_student on reward_redemptions(student_id);

-- Seed the point catalog from the spec (school_id null = global defaults).
insert into behavior_categories (school_id, category, title, points)
select null, category, title, points
from (values
  ('positive', 'เข้าเรียนตรงเวลา', 5),
  ('positive', 'ส่งการบ้าน', 10),
  ('positive', 'ช่วยเหลือเพื่อน', 10),
  ('positive', 'มีส่วนร่วมในชั้นเรียน', 5),
  ('positive', 'กิจกรรมการอ่าน', 15),
  ('positive', 'เข้าร่วมกิจกรรมโรงเรียน', 20),
  ('positive', 'ภาวะผู้นำ', 20),
  ('positive', 'งานอาสาสมัคร', 20),
  ('positive', 'ความประพฤติดีเยี่ยม', 10),
  ('negative', 'เข้าเรียนสาย', -5),
  ('negative', 'ไม่ส่งการบ้าน', -10),
  ('negative', 'ก่อกวนในชั้นเรียน', -15),
  ('negative', 'ทะเลาะวิวาท', -30),
  ('negative', 'รังแกผู้อื่น', -50),
  ('negative', 'ไม่ให้ความเคารพ', -20),
  ('negative', 'แต่งกายผิดระเบียบ', -10),
  ('negative', 'ทำลายทรัพย์สินโรงเรียน', -50)
) as seed(category, title, points)
where not exists (select 1 from behavior_categories where school_id is null);

insert into achievements (school_id, code, title, description, icon, xp_reward, coin_reward)
select null, code, title, description, icon, xp_reward, coin_reward
from (values
  ('perfect_attendance', 'มาเรียนสมบูรณ์', 'มาเรียนครบทุกวันในเดือน', 'CalendarCheck', 50, 20),
  ('homework_hero', 'ฮีโร่การบ้าน', 'ส่งการบ้านครบทุกชิ้นในสัปดาห์', 'BookOpen', 30, 10),
  ('reading_master', 'นักอ่านระดับเซียน', 'อ่านหนังสือครบเป้าหมาย', 'Book', 30, 10),
  ('coding_star', 'นักโค้ดดิ้งดาวเด่น', 'ทำกิจกรรมโค้ดดิ้งสำเร็จ', 'Code', 30, 10),
  ('class_leader', 'ผู้นำห้องเรียน', 'แสดงความเป็นผู้นำในชั้นเรียน', 'Crown', 40, 15),
  ('sports_champion', 'แชมป์กีฬา', 'ชนะการแข่งขันกีฬา', 'Trophy', 40, 15),
  ('xp_100', 'นักสำรวจ', 'สะสม XP ครบ 100', 'Star', 0, 5),
  ('xp_500', 'แชมป์ระดับกลาง', 'สะสม XP ครบ 500', 'Star', 0, 10),
  ('xp_1000', 'ตำนาน', 'สะสม XP ครบ 1000', 'Star', 0, 20)
) as seed(code, title, description, icon, xp_reward, coin_reward)
where not exists (select 1 from achievements where code = seed.code);

alter table behavior_categories enable row level security;
alter table quests enable row level security;
alter table student_quests enable row level security;
alter table reward_redemptions enable row level security;

create policy behavior_categories_super_admin_all on behavior_categories for all using (current_role_name() = 'super_admin');
create policy behavior_categories_select on behavior_categories for select using (school_id is null or school_id = current_school_id());
create policy behavior_categories_admin_manage on behavior_categories for all using (current_role_name() = 'school_admin' and school_id = current_school_id());

create policy quests_super_admin_all on quests for all using (current_role_name() = 'super_admin');
create policy quests_school_select on quests for select using (school_id = current_school_id());
create policy quests_admin_teacher_manage on quests for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());

create policy student_quests_super_admin_all on student_quests for all using (current_role_name() = 'super_admin');
create policy student_quests_admin_manage on student_quests for all using (
  current_role_name() = 'school_admin' and exists (select 1 from students s where s.id = student_id and s.school_id = current_school_id())
);
create policy student_quests_teacher_manage on student_quests for all using (current_role_name() = 'teacher' and is_my_student(student_id));
create policy student_quests_parent_select on student_quests for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy student_quests_student_select on student_quests for select using (current_role_name() = 'student' and student_id = current_student_id());

create policy reward_redemptions_super_admin_all on reward_redemptions for all using (current_role_name() = 'super_admin');
create policy reward_redemptions_admin_teacher_manage on reward_redemptions for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());
create policy reward_redemptions_parent_select on reward_redemptions for select using (current_role_name() = 'parent' and is_my_child(student_id));
create policy reward_redemptions_student_select on reward_redemptions for select using (current_role_name() = 'student' and student_id = current_student_id());
