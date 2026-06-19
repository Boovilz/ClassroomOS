-- ============================================================================
-- 0004: Behavior & gamification - records, XP/coin ledgers, achievements,
-- leaderboards
-- ============================================================================

create table if not exists behavior_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  recorded_by uuid references users(id) on delete set null,
  category text not null check (category in ('positive', 'negative')),
  title text not null,
  description text,
  points int not null default 0,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only ledger of XP gains/losses. `students.xp` is a denormalized
-- running total kept in sync by the application layer.
create table if not exists xp_transactions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  amount int not null,
  reason text not null,
  related_behavior_record_id uuid references behavior_records(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Append-only ledger of coin gains/spends (e.g. reward shop redemptions).
create table if not exists coin_transactions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  amount int not null, -- positive = earned, negative = spent
  reason text not null,
  reward_item_id uuid,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  code text not null unique,
  title text not null,
  description text,
  icon text,
  xp_reward int not null default 0,
  coin_reward int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists student_achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (student_id, achievement_id)
);

-- Materialized/cached leaderboard snapshot (can be recomputed periodically;
-- the live leaderboard page can also just query `students` ordered by xp).
create table if not exists leaderboards (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  period text not null check (period in ('weekly', 'monthly', 'all_time')),
  rank int not null,
  xp int not null,
  computed_at timestamptz not null default now()
);

create table if not exists reward_shop_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  description text,
  cost_coins int not null,
  stock int,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_behavior_records_updated_at before update on behavior_records for each row execute function set_updated_at();
create trigger trg_reward_shop_items_updated_at before update on reward_shop_items for each row execute function set_updated_at();

create index if not exists idx_behavior_records_student on behavior_records(student_id);
create index if not exists idx_xp_transactions_student on xp_transactions(student_id);
create index if not exists idx_coin_transactions_student on coin_transactions(student_id);
create index if not exists idx_leaderboards_school_period on leaderboards(school_id, period);
