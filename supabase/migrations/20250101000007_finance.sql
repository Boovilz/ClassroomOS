-- ============================================================================
-- 0007: Finance - classroom/school accounts and transactions
-- ============================================================================

create table if not exists finance_accounts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('classroom_fund', 'school_fund', 'lunch_fund', 'other')),
  balance numeric not null default 0,
  classroom text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  account_id uuid not null references finance_accounts(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  category text,
  amount numeric not null,
  description text,
  recorded_by uuid references users(id) on delete set null,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_finance_accounts_updated_at before update on finance_accounts for each row execute function set_updated_at();
create trigger trg_finance_transactions_updated_at before update on finance_transactions for each row execute function set_updated_at();

create index if not exists idx_finance_accounts_school on finance_accounts(school_id);
create index if not exists idx_finance_transactions_account on finance_transactions(account_id);
create index if not exists idx_finance_transactions_student on finance_transactions(student_id);
