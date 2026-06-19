-- ============================================================================
-- 0015: Finance v2 - Student Savings (Passbook), Withdrawals/Approvals,
-- Classroom Fund Expenses, Receipts, QR Payments, Savings Goals, Audit Log.
--
-- Reuses (does NOT duplicate):
--   - finance_accounts: extended with student_id/account_number/status so a
--     "savings" account_type row IS the student's passbook account
--     (account_type already included 'savings' from migration 0007).
--   - finance_transactions: extended with transaction_no/balance_after/
--     status/approved_by/related fields so deposits & withdrawals are rows
--     here (type='income' = deposit, type='expense' = withdrawal/expense),
--     rather than a separate ledger table.
--   - xp_transactions / coin_transactions / achievements / student_achievements
--     (module 4): reused as-is for the savings leaderboard rewards, no new
--     XP/coin/badge tables created here.
-- New tables (genuinely new concepts not covered above):
--   finance_categories, finance_expenses, finance_receipts,
--   finance_qr_payments, finance_goals, finance_goal_progress,
--   finance_audit_logs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extend finance_accounts to also represent student savings/passbook accounts
-- ----------------------------------------------------------------------------
alter table finance_accounts add column if not exists student_id uuid references students(id) on delete cascade;
alter table finance_accounts add column if not exists account_number text;
alter table finance_accounts add column if not exists status text not null default 'active';
do $$ begin
  alter table finance_accounts add constraint finance_accounts_status_check check (status in ('active', 'frozen', 'closed'));
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table finance_accounts add constraint finance_accounts_account_number_key unique (account_number);
exception when duplicate_object then null;
end $$;

create index if not exists idx_finance_accounts_student on finance_accounts(student_id);

-- ----------------------------------------------------------------------------
-- Extend finance_transactions for deposit/withdrawal workflow + receipts
-- ----------------------------------------------------------------------------
alter table finance_transactions add column if not exists transaction_no text;
alter table finance_transactions add column if not exists balance_after numeric;
alter table finance_transactions add column if not exists status text not null default 'completed';
do $$ begin
  alter table finance_transactions add constraint finance_transactions_status_check
    check (status in ('pending', 'completed', 'rejected', 'cancelled'));
exception when duplicate_object then null;
end $$;
alter table finance_transactions add column if not exists txn_subtype text;
do $$ begin
  alter table finance_transactions add constraint finance_transactions_txn_subtype_check
    check (txn_subtype is null or txn_subtype in ('deposit', 'withdrawal', 'expense', 'donation', 'fund_income'));
exception when duplicate_object then null;
end $$;
alter table finance_transactions add column if not exists approved_by uuid references users(id) on delete set null;
alter table finance_transactions add column if not exists approved_at timestamptz;
alter table finance_transactions add column if not exists rejection_reason text;
do $$ begin
  alter table finance_transactions add constraint finance_transactions_transaction_no_key unique (transaction_no);
exception when duplicate_object then null;
end $$;

create index if not exists idx_finance_transactions_status on finance_transactions(status);
create index if not exists idx_finance_transactions_occurred_at on finance_transactions(occurred_at);

-- ----------------------------------------------------------------------------
-- finance_categories: catalog for classroom fund income/expense categories
-- ----------------------------------------------------------------------------
create table if not exists finance_categories (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  name text not null,
  icon text,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_categories_school on finance_categories(school_id);

insert into finance_categories (school_id, kind, name, icon)
select null, kind, name, icon
from (values
  ('expense', 'กิจกรรมในชั้นเรียน', 'PartyPopper'),
  ('expense', 'วัสดุการเรียนการสอน', 'BookOpen'),
  ('expense', 'ทัศนศึกษา', 'Bus'),
  ('expense', 'งานบริจาค', 'HeartHandshake'),
  ('expense', 'กิจกรรมโรงเรียน', 'School'),
  ('expense', 'ค่าใช้จ่ายฉุกเฉิน', 'AlertTriangle'),
  ('income', 'เงินบริจาค', 'Gift'),
  ('income', 'เงินสนับสนุนกิจกรรม', 'HandCoins'),
  ('income', 'รายรับอื่นๆ', 'Wallet')
) as seed(kind, name, icon)
where not exists (select 1 from finance_categories where school_id is null);

-- ----------------------------------------------------------------------------
-- finance_expenses: classroom-fund expense requests/records (approval flow)
-- ----------------------------------------------------------------------------
create table if not exists finance_expenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  account_id uuid not null references finance_accounts(id) on delete cascade,
  category_id uuid references finance_categories(id) on delete set null,
  finance_transaction_id uuid references finance_transactions(id) on delete set null,
  name text not null,
  amount numeric not null check (amount > 0),
  expense_date date not null default current_date,
  receipt_url text,
  description text,
  requested_by uuid references users(id) on delete set null,
  approved_by uuid references users(id) on delete set null,
  approved_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_finance_expenses_updated_at before update on finance_expenses for each row execute function set_updated_at();
create index if not exists idx_finance_expenses_school on finance_expenses(school_id);
create index if not exists idx_finance_expenses_account on finance_expenses(account_id);
create index if not exists idx_finance_expenses_status on finance_expenses(status);

-- ----------------------------------------------------------------------------
-- finance_receipts: printable receipts for deposit/withdrawal/expense/donation
-- ----------------------------------------------------------------------------
create table if not exists finance_receipts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  receipt_no text not null,
  receipt_type text not null check (receipt_type in ('deposit', 'withdrawal', 'expense', 'donation')),
  finance_transaction_id uuid references finance_transactions(id) on delete set null,
  finance_expense_id uuid references finance_expenses(id) on delete set null,
  issued_to text,
  amount numeric not null,
  verification_code text not null,
  issued_by uuid references users(id) on delete set null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

do $$ begin
  alter table finance_receipts add constraint finance_receipts_receipt_no_key unique (receipt_no);
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table finance_receipts add constraint finance_receipts_verification_code_key unique (verification_code);
exception when duplicate_object then null;
end $$;

create index if not exists idx_finance_receipts_school on finance_receipts(school_id);
create index if not exists idx_finance_receipts_transaction on finance_receipts(finance_transaction_id);

-- ----------------------------------------------------------------------------
-- finance_qr_payments: static/dynamic PromptPay-style QR tracking (no real
-- payment gateway integration - payload is generated client-side and status
-- is updated manually/by a teacher confirming receipt of payment).
-- ----------------------------------------------------------------------------
create table if not exists finance_qr_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  purpose text not null check (purpose in ('school_activity', 'fundraising', 'donation', 'field_trip', 'other')),
  title text not null,
  description text,
  qr_type text not null default 'dynamic' check (qr_type in ('static', 'dynamic')),
  target_amount numeric,
  amount numeric,
  payload text not null,
  status text not null default 'active' check (status in ('active', 'paid', 'expired', 'cancelled')),
  created_by uuid references users(id) on delete set null,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_qr_payments_school on finance_qr_payments(school_id);
create index if not exists idx_finance_qr_payments_status on finance_qr_payments(status);

-- ----------------------------------------------------------------------------
-- finance_goals + finance_goal_progress: student savings goals
-- ----------------------------------------------------------------------------
create table if not exists finance_goals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  account_id uuid references finance_accounts(id) on delete set null,
  title text not null,
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0,
  target_date date,
  status text not null default 'active' check (status in ('active', 'achieved', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_finance_goals_updated_at before update on finance_goals for each row execute function set_updated_at();
create index if not exists idx_finance_goals_student on finance_goals(student_id);
create index if not exists idx_finance_goals_status on finance_goals(status);

create table if not exists finance_goal_progress (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references finance_goals(id) on delete cascade,
  finance_transaction_id uuid references finance_transactions(id) on delete set null,
  amount numeric not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_finance_goal_progress_goal on finance_goal_progress(goal_id);

-- ----------------------------------------------------------------------------
-- finance_audit_logs: track create/update/delete/approve/reject across the
-- finance module (deposits, withdrawals, edits, deletes, approvals).
-- ----------------------------------------------------------------------------
create table if not exists finance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete', 'approve', 'reject')),
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_audit_logs_school on finance_audit_logs(school_id);
create index if not exists idx_finance_audit_logs_entity on finance_audit_logs(entity_type, entity_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table finance_categories enable row level security;
alter table finance_expenses enable row level security;
alter table finance_receipts enable row level security;
alter table finance_qr_payments enable row level security;
alter table finance_goals enable row level security;
alter table finance_goal_progress enable row level security;
alter table finance_audit_logs enable row level security;

-- finance_categories
do $$ begin
  create policy finance_categories_super_admin_all on finance_categories for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_categories_select on finance_categories for select using (school_id is null or school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_categories_admin_manage on finance_categories for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- finance_expenses
do $$ begin
  create policy finance_expenses_super_admin_all on finance_expenses for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_expenses_admin_manage on finance_expenses for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_expenses_teacher_manage on finance_expenses for all using (current_role_name() = 'teacher' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- finance_receipts
do $$ begin
  create policy finance_receipts_super_admin_all on finance_receipts for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_receipts_admin_teacher_manage on finance_receipts for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_receipts_parent_select on finance_receipts for select using (
    current_role_name() = 'parent' and exists (
      select 1 from finance_transactions ft join students s on s.id = ft.student_id
      where ft.id = finance_receipts.finance_transaction_id and is_my_child(s.id)
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_receipts_student_select on finance_receipts for select using (
    current_role_name() = 'student' and exists (
      select 1 from finance_transactions ft
      where ft.id = finance_receipts.finance_transaction_id and ft.student_id = current_student_id()
    )
  );
exception when duplicate_object then null; end $$;

-- finance_qr_payments
do $$ begin
  create policy finance_qr_payments_super_admin_all on finance_qr_payments for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_qr_payments_admin_teacher_manage on finance_qr_payments for all using (current_role_name() in ('school_admin', 'teacher') and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_qr_payments_select on finance_qr_payments for select using (school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- finance_goals
do $$ begin
  create policy finance_goals_super_admin_all on finance_goals for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_goals_admin_manage on finance_goals for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_goals_teacher_manage on finance_goals for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_goals_parent_select on finance_goals for select using (current_role_name() = 'parent' and is_my_child(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_goals_student_manage on finance_goals for all using (current_role_name() = 'student' and student_id = current_student_id());
exception when duplicate_object then null; end $$;

-- finance_goal_progress
do $$ begin
  create policy finance_goal_progress_super_admin_all on finance_goal_progress for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_goal_progress_admin_teacher_manage on finance_goal_progress for all using (
    current_role_name() in ('school_admin', 'teacher') and exists (
      select 1 from finance_goals g where g.id = finance_goal_progress.goal_id and g.school_id = current_school_id()
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_goal_progress_select on finance_goal_progress for select using (
    exists (
      select 1 from finance_goals g where g.id = finance_goal_progress.goal_id
      and (is_my_child(g.student_id) or g.student_id = current_student_id() or g.school_id = current_school_id())
    )
  );
exception when duplicate_object then null; end $$;

-- finance_audit_logs
do $$ begin
  create policy finance_audit_logs_super_admin_all on finance_audit_logs for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_audit_logs_admin_select on finance_audit_logs for select using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy finance_audit_logs_insert on finance_audit_logs for insert with check (school_id = current_school_id());
exception when duplicate_object then null; end $$;
