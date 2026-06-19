-- ============================================================================
-- Seed data: 1 school, 5 teachers + 1 admin, 20 students with Thai names,
-- parents, plus sample attendance/behavior/score rows so the app is
-- demoable end-to-end.
--
-- NOTE: `users` rows have a FK to auth.users(id). This seed inserts directly
-- into auth.users with a dummy bcrypt password hash so it works against a
-- local `supabase start` Postgres instance. Direct writes to auth.users are
-- usually blocked on hosted Supabase projects — for a hosted project,
-- create these accounts via the Auth admin API / dashboard first and then
-- adjust the UUIDs below (or just seed the non-auth-linked tables and skip
-- the `users`/`teachers` rows that depend on auth.users).
-- Run with: supabase db reset (applies migrations then this file), or
-- `psql $DATABASE_URL -f supabase/seed.sql` after migrations are applied.
-- ============================================================================

insert into schools (id, name, name_en, address, province, phone)
values (
  '00000000-0000-0000-0000-000000000001',
  'โรงเรียนบ้านสวนสมบูรณ์',
  'Ban Suan Somboon School',
  '99 หมู่ 4 ถนนสุขาภิบาล ตำบลสุเทพ',
  'เชียงใหม่',
  '053-123456'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 1 school admin + 5 teachers (auth.users + users + teachers)
-- ---------------------------------------------------------------------------
do $$
declare
  v_school_id uuid := '00000000-0000-0000-0000-000000000001';
  v_teacher_ids uuid[] := array[
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005'
  ];
  v_teacher_names text[] := array[
    'ครูสมหญิง ใจดี',
    'ครูประยุทธ์ มั่นคง',
    'ครูวันเพ็ญ สว่างใจ',
    'ครูธีรพงษ์ เก่งกล้า',
    'ครูนภาพร อารีย์'
  ];
  v_admin_id uuid := '10000000-0000-0000-0000-000000000099';
  i int;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values (v_admin_id, 'admin@bansuan.ac.th', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  insert into users (id, school_id, email, full_name, role)
  values (v_admin_id, v_school_id, 'admin@bansuan.ac.th', 'ผู้อำนวยการสมศักดิ์ ตั้งมั่น', 'school_admin')
  on conflict (id) do nothing;

  for i in 1..5 loop
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    values (
      v_teacher_ids[i], 'teacher' || i || '@bansuan.ac.th',
      crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'
    )
    on conflict (id) do nothing;

    insert into users (id, school_id, email, full_name, role)
    values (v_teacher_ids[i], v_school_id, 'teacher' || i || '@bansuan.ac.th', v_teacher_names[i], 'teacher')
    on conflict (id) do nothing;

    insert into teachers (id, user_id, school_id, teacher_code, subject_specialty, homeroom_classroom)
    values (
      ('20000000-0000-0000-0000-00000000000' || i)::uuid,
      v_teacher_ids[i], v_school_id, 'T0' || i,
      (array['คณิตศาสตร์', 'ภาษาไทย', 'วิทยาศาสตร์', 'ภาษาอังกฤษ', 'สังคมศึกษา'])[i],
      'ป.' || i || '/1'
    )
    on conflict (id) do nothing;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 20 students with Thai names, round-robin across the 5 teachers
-- ---------------------------------------------------------------------------
do $$
declare
  v_school_id uuid := '00000000-0000-0000-0000-000000000001';
  v_first_names text[] := array[
    'สมชาย','สมหญิง','กมล','วิภา','ธนากร','ปิยะดา','ณัฐวุฒิ','ชุติมา','อนุชา','พิมพ์ใจ',
    'ศักดิ์สิทธิ์','รัตนา','เอกพันธ์','สุภาพร','วรากร','นันทนา','ภานุวัฒน์','อรอุมา','ชัยวัฒน์','กัญญารัตน์'
  ];
  v_last_names text[] := array[
    'ใจกล้า','รุ่งเรือง','สว่างวงศ์','เพียรดี','มั่งมี','ศรีสุข','แสนสุข','บุญมาก','ทองดี','วงศ์สุวรรณ'
  ];
  v_teacher_ids uuid[] := array[
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000005'
  ];
  v_student_id uuid;
  i int;
begin
  for i in 1..20 loop
    v_student_id := ('30000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;

    insert into students (
      id, school_id, teacher_id, student_code, full_name, nickname, gender,
      birth_date, grade, classroom, level, xp, coins
    )
    values (
      v_student_id, v_school_id, v_teacher_ids[((i - 1) % 5) + 1],
      'STU' || lpad(i::text, 4, '0'),
      v_first_names[i] || ' ' || v_last_names[((i - 1) % 10) + 1],
      'น้อง' || substring(v_first_names[i] from 1 for 2),
      case when i % 2 = 0 then 'male' else 'female' end,
      (date '2016-05-01' + (i || ' months')::interval)::date,
      'ป.' || (((i - 1) % 5) + 1),
      'ป.' || (((i - 1) % 5) + 1) || '/1',
      1 + (i % 3),
      (i * 37) % 500,
      (i * 13) % 200
    )
    on conflict (id) do nothing;

    insert into parents (school_id, student_id, full_name, relationship, phone, is_primary_contact)
    values (
      v_school_id, v_student_id, 'ผู้ปกครองของ ' || v_first_names[i],
      case when i % 2 = 0 then 'father' else 'mother' end,
      '08' || lpad((10000000 + i)::text, 8, '0'),
      true
    );

    insert into attendance (school_id, student_id, date, status)
    select
      v_school_id, v_student_id, d::date,
      (array['present','present','present','late','sick','absent','present'])[1 + (i + extract(day from d)::int) % 7]::attendance_status
    from generate_series(current_date - interval '6 days', current_date, interval '1 day') as d
    where extract(isodow from d) < 6
    on conflict (student_id, date) do nothing;

    insert into behavior_records (school_id, student_id, category, title, points, occurred_at)
    values
      (v_school_id, v_student_id, 'positive', 'ช่วยเหลือเพื่อนในห้องเรียน', 10, now() - interval '2 days'),
      (v_school_id, v_student_id, 'positive', 'ส่งการบ้านตรงเวลา', 5, now() - interval '1 day');

    insert into xp_transactions (school_id, student_id, amount, reason)
    values
      (v_school_id, v_student_id, 10, 'ช่วยเหลือเพื่อนในห้องเรียน'),
      (v_school_id, v_student_id, 5, 'ส่งการบ้านตรงเวลา');

    insert into coin_transactions (school_id, student_id, amount, reason)
    values (v_school_id, v_student_id, 15, 'รางวัลพฤติกรรมดี');
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Subjects + sample scores
-- ---------------------------------------------------------------------------
insert into subjects (id, school_id, name, code, grade)
values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'คณิตศาสตร์', 'MATH', 'ป.1-6'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ภาษาไทย', 'THAI', 'ป.1-6'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'วิทยาศาสตร์', 'SCI', 'ป.1-6')
on conflict (id) do nothing;

insert into scores (school_id, student_id, subject_id, score, max_score, term)
select
  '00000000-0000-0000-0000-000000000001',
  ('30000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-0000-0000-000000000001',
  60 + (i * 7) % 40,
  100,
  '1/2568'
from generate_series(1, 20) as i;

-- ---------------------------------------------------------------------------
-- Reward shop items
-- ---------------------------------------------------------------------------
insert into reward_shop_items (school_id, name, description, cost_coins, stock)
values
  ('00000000-0000-0000-0000-000000000001', 'ดินสอสีไม้ชุดพิเศษ', 'ดินสอสีไม้ 12 สี', 50, 30),
  ('00000000-0000-0000-0000-000000000001', 'สมุดโน้ตลายการ์ตูน', 'สมุดโน้ตปกแข็ง', 30, 50),
  ('00000000-0000-0000-0000-000000000001', 'บัตรของขวัญร้านขนม', 'มูลค่า 20 บาท', 100, 10),
  ('00000000-0000-0000-0000-000000000001', 'เวลาพักเพิ่ม 10 นาที', 'ใช้ได้ 1 ครั้ง', 80, null);
