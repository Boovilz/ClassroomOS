-- ============================================================================
-- 0002: Core tables - schools, users, teachers, students, parents
-- ============================================================================

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  address text,
  province text,
  phone text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `users` mirrors auth.users (1:1) and stores app-level profile/role info.
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete set null,
  email text not null,
  full_name text not null,
  role role not null default 'teacher',
  avatar_url text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  teacher_code text,
  subject_specialty text,
  homeroom_classroom text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  teacher_id uuid references teachers(id) on delete set null,
  student_code text not null,
  citizen_id text,
  full_name text not null,
  full_name_en text,
  nickname text,
  gender text check (gender in ('male', 'female', 'other')),
  birth_date date,
  grade text,
  classroom text,
  address text,
  blood_type text,
  avatar_url text,
  level int not null default 1,
  xp int not null default 0,
  coins int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_code)
);

create table if not exists parents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  full_name text not null,
  relationship text check (relationship in ('father', 'mother', 'guardian', 'other')),
  occupation text,
  phone text,
  email text,
  is_primary_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_schools_updated_at before update on schools for each row execute function set_updated_at();
create trigger trg_users_updated_at before update on users for each row execute function set_updated_at();
create trigger trg_teachers_updated_at before update on teachers for each row execute function set_updated_at();
create trigger trg_students_updated_at before update on students for each row execute function set_updated_at();
create trigger trg_parents_updated_at before update on parents for each row execute function set_updated_at();

create index if not exists idx_users_school_id on users(school_id);
create index if not exists idx_teachers_school_id on teachers(school_id);
create index if not exists idx_students_school_id on students(school_id);
create index if not exists idx_students_teacher_id on students(teacher_id);
create index if not exists idx_parents_student_id on parents(student_id);
