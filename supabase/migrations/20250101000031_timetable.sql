-- Timetable entries for teacher schedule and class schedule
create table if not exists timetable_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  academic_year int not null,          -- BE year e.g. 2569
  semester int not null check (semester in (1, 2)),
  entry_type text not null check (entry_type in ('teacher', 'class')),
  -- For teacher schedule: teacher_user_id is set; for class schedule: classroom is set
  teacher_user_id uuid references users(id) on delete cascade,
  classroom text,                      -- e.g. 'ป.6/2'
  day_of_week int not null check (day_of_week between 1 and 5), -- 1=จันทร์ ... 5=ศุกร์
  period int not null check (period between 1 and 8),
  subject_code text,
  subject_name text not null,
  teacher_name text,                   -- for class schedule only
  start_time text,                     -- e.g. '08:30'
  end_time text,                       -- e.g. '09:30'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists timetable_entries_school_id_idx on timetable_entries(school_id);
create index if not exists timetable_entries_teacher_idx on timetable_entries(school_id, teacher_user_id, academic_year, semester);
create index if not exists timetable_entries_class_idx on timetable_entries(school_id, classroom, academic_year, semester);

alter table timetable_entries enable row level security;

create policy "timetable_entries_school_access" on timetable_entries
  for all using (
    school_id in (
      select school_id from users where id = auth.uid()
    )
  );
