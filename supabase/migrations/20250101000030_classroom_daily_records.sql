-- Daily classroom health records: milk drinking and tooth brushing
-- (Lunch uses existing meal_records table)
create table if not exists classroom_daily_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  record_type text not null check (record_type in ('milk', 'tooth_brush')),
  status text not null check (status in ('yes', 'no', 'absent')),
  created_at timestamptz not null default now(),
  unique(student_id, date, record_type)
);

create index if not exists idx_classroom_daily_records_school_date
  on classroom_daily_records(school_id, date, record_type);

create index if not exists idx_classroom_daily_records_student
  on classroom_daily_records(student_id, record_type, date);

alter table classroom_daily_records enable row level security;

create policy "school members can manage daily records"
  on classroom_daily_records
  for all
  using (
    school_id = (
      select school_id from users where id = auth.uid()
    )
  );
