-- ============================================================================
-- 0017: Lunch v2 - Module 8 School Lunch & Nutrition System
--
-- Reuses (does NOT duplicate):
--   - meal_records (0008): extended in place to become the per-student daily
--     meal-distribution log (QR Food Distribution + Meal Eligibility linkage).
--     Added menu_id/distribution_method/distributed_by/eligibility snapshot
--     columns instead of creating a parallel "meal_distributions" table.
--   - allergies (0016, Module 7): reused as-is for food allergy alerts during
--     distribution via getActiveAllergyMap(). Extended in place with
--     religion/medical-diet oriented fields so it also covers the spec's
--     "Special Diet Management" (religious restrictions, medical diets,
--     special nutrition plans) instead of a new special_diets table.
--   - finance_accounts (account_type = 'lunch_fund', 0007) + finance_expenses
--     (0007/0015): reused as the food budget ledger and food purchase
--     expense log (Food Cost Management) instead of new budget tables.
--   - qr_tokens / qr_scan_history / generateQrToken / verifyQrToken
--     (Module 3, 0012): reused as-is for QR Food Distribution scanning
--     (purpose = 'lunch_distribution') instead of a parallel QR system.
--   - students.grade / students.classroom (0002): used directly for
--     eligibility/report grouping instead of duplicating on a new table.
--   - is_my_child() / is_my_student() / current_role_name() / current_school_id()
--     RLS helpers (0009): reused as-is for every new table below.
--
-- New tables (genuinely new concepts not covered above):
--   menus, menu_items (Daily/Weekly/Monthly Menu Management + AI Menu Planner),
--   meal_eligibility (Student Meal Eligibility / free lunch / scholarship),
--   food_inventory, inventory_transactions (Ingredient Inventory + Stock Mgmt),
--   food_suppliers, purchase_orders (Procurement System),
--   food_safety_logs (single table, log_type discriminator, per scoping note).
--
-- Deliberately SKIPPED per scoping philosophy:
--   - meal_distributions -> meal_records extended in place (see above).
--   - special_diets -> allergies extended in place (see above).
--   - nutrition_records / meal_reports -> computed on-demand in
--     src/lib/queries/lunch.ts from menu_items + meal_records, never stored.
--   - food_categories -> a simple check-constraint enum on menu_items.category
--     is sufficient (Rice/Noodle/Soup/Dessert/Fruit/Milk), no reference table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extend meal_records -> meal distribution log (links menu + eligibility +
-- QR distribution method)
-- ----------------------------------------------------------------------------
alter table meal_records add column if not exists menu_id uuid;
alter table meal_records add column if not exists distribution_method text not null default 'manual';
do $$ begin
  alter table meal_records add constraint meal_records_distribution_method_check
    check (distribution_method in ('qr', 'student_id', 'manual'));
exception when duplicate_object then null;
end $$;
alter table meal_records add column if not exists distributed_by uuid references users(id) on delete set null;
alter table meal_records add column if not exists eligibility_status_snapshot text;
alter table meal_records add column if not exists cost numeric;

create index if not exists idx_meal_records_date on meal_records(date);
create index if not exists idx_meal_records_menu on meal_records(menu_id);

-- ----------------------------------------------------------------------------
-- Extend allergies -> also cover religious restrictions / medical diets /
-- special nutrition plans (Special Diet Management), avoiding a new table.
-- ----------------------------------------------------------------------------
do $$ begin
  alter table allergies drop constraint allergies_allergy_type_check;
exception when undefined_object then null;
end $$;
do $$ begin
  alter table allergies add constraint allergies_allergy_type_check
    check (allergy_type in ('food', 'drug', 'environmental', 'religious', 'medical_diet', 'nutrition_plan'));
exception when duplicate_object then null;
end $$;
alter table allergies add column if not exists diet_label text;
alter table allergies add column if not exists show_at_meal_distribution boolean not null default true;

create index if not exists idx_allergies_diet_label on allergies(diet_label);

-- ----------------------------------------------------------------------------
-- menus: daily/weekly/monthly/semester menu entries
-- ----------------------------------------------------------------------------
create table if not exists menus (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  menu_date date not null,
  meal_type text not null default 'lunch' check (meal_type in ('breakfast', 'lunch', 'snack')),
  plan_scope text not null default 'daily' check (plan_scope in ('daily', 'weekly', 'monthly', 'semester')),
  description text,
  image_url text,
  total_calories numeric,
  total_protein_g numeric,
  total_carbs_g numeric,
  total_fat_g numeric,
  estimated_cost_per_student numeric,
  status text not null default 'planned' check (status in ('planned', 'published', 'served', 'cancelled')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, menu_date, meal_type)
);

create trigger trg_menus_updated_at before update on menus for each row execute function set_updated_at();
create index if not exists idx_menus_school_date on menus(school_id, menu_date);
create index if not exists idx_menus_scope on menus(plan_scope);

alter table meal_records add constraint meal_records_menu_id_fkey
  foreign key (menu_id) references menus(id) on delete set null;

-- ----------------------------------------------------------------------------
-- menu_items: individual dishes within a menu, with nutrition + category
-- ----------------------------------------------------------------------------
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  menu_id uuid not null references menus(id) on delete cascade,
  name text not null,
  category text not null check (category in ('rice', 'noodle', 'soup', 'dessert', 'fruit', 'milk')),
  ingredients text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  has_vegetables boolean not null default false,
  has_fruit boolean not null default false,
  has_milk boolean not null default false,
  image_url text,
  cost_per_serving numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_items_menu on menu_items(menu_id);
create index if not exists idx_menu_items_category on menu_items(category);

-- ----------------------------------------------------------------------------
-- meal_eligibility: free lunch / special support / scholarship / restrictions
-- ----------------------------------------------------------------------------
create table if not exists meal_eligibility (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  program_type text not null default 'free_lunch'
    check (program_type in ('free_lunch', 'special_support', 'scholarship', 'paid')),
  status text not null default 'pending_review' check (status in ('eligible', 'not_eligible', 'pending_review')),
  meal_restrictions text,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  effective_from date not null default current_date,
  effective_to date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id)
);

create trigger trg_meal_eligibility_updated_at before update on meal_eligibility for each row execute function set_updated_at();
create index if not exists idx_meal_eligibility_student on meal_eligibility(student_id);
create index if not exists idx_meal_eligibility_status on meal_eligibility(status);

-- ----------------------------------------------------------------------------
-- food_inventory: ingredients/food supplies/kitchen materials
-- ----------------------------------------------------------------------------
create table if not exists food_inventory (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  item_name text not null,
  category text not null default 'ingredient' check (category in ('ingredient', 'supply', 'kitchen_material')),
  quantity numeric not null default 0,
  unit text not null default 'kg',
  reorder_level numeric not null default 0,
  purchase_date date,
  expiration_date date,
  supplier_id uuid,
  unit_cost numeric,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_food_inventory_updated_at before update on food_inventory for each row execute function set_updated_at();
create index if not exists idx_food_inventory_school on food_inventory(school_id);
create index if not exists idx_food_inventory_expiration on food_inventory(expiration_date);
create index if not exists idx_food_inventory_quantity on food_inventory(quantity);

-- ----------------------------------------------------------------------------
-- inventory_transactions: add/remove/adjust/transfer stock + audit trail
-- ----------------------------------------------------------------------------
create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  inventory_id uuid not null references food_inventory(id) on delete cascade,
  txn_type text not null check (txn_type in ('add', 'remove', 'adjust', 'transfer', 'audit')),
  quantity_change numeric not null,
  quantity_after numeric not null,
  reason text,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_transactions_inventory on inventory_transactions(inventory_id);
create index if not exists idx_inventory_transactions_type on inventory_transactions(txn_type);

-- ----------------------------------------------------------------------------
-- food_suppliers: procurement vendors
-- ----------------------------------------------------------------------------
create table if not exists food_suppliers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_food_suppliers_updated_at before update on food_suppliers for each row execute function set_updated_at();
create index if not exists idx_food_suppliers_school on food_suppliers(school_id);

alter table food_inventory add constraint food_inventory_supplier_id_fkey
  foreign key (supplier_id) references food_suppliers(id) on delete set null;

-- ----------------------------------------------------------------------------
-- purchase_orders: PO/invoice/delivery tracking (vendor performance is
-- computed on-demand from this table's history, not stored separately)
-- ----------------------------------------------------------------------------
create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  supplier_id uuid not null references food_suppliers(id) on delete cascade,
  order_no text not null,
  item_summary text,
  total_amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'ordered', 'delivered', 'invoiced', 'paid', 'cancelled')),
  ordered_at date not null default current_date,
  expected_delivery_date date,
  delivered_at date,
  finance_expense_id uuid,
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_purchase_orders_updated_at before update on purchase_orders for each row execute function set_updated_at();
create index if not exists idx_purchase_orders_supplier on purchase_orders(supplier_id);
create index if not exists idx_purchase_orders_status on purchase_orders(status);

do $$ begin
  alter table purchase_orders add constraint purchase_orders_finance_expense_id_fkey
    foreign key (finance_expense_id) references finance_expenses(id) on delete set null;
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- food_safety_logs: inspections / hygiene / equipment maintenance /
-- temperature logs / cleaning schedules — single table, log_type discriminator
-- ----------------------------------------------------------------------------
create table if not exists food_safety_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  log_type text not null check (log_type in (
    'inspection', 'hygiene', 'equipment_maintenance', 'temperature', 'cleaning_schedule'
  )),
  log_date date not null default current_date,
  subject text not null,
  result text check (result in ('pass', 'fail', 'needs_attention')),
  temperature_celsius numeric,
  notes text,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_food_safety_logs_school on food_safety_logs(school_id);
create index if not exists idx_food_safety_logs_type on food_safety_logs(log_type);
create index if not exists idx_food_safety_logs_date on food_safety_logs(log_date);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table menus enable row level security;
alter table menu_items enable row level security;
alter table meal_eligibility enable row level security;
alter table food_inventory enable row level security;
alter table inventory_transactions enable row level security;
alter table food_suppliers enable row level security;
alter table purchase_orders enable row level security;
alter table food_safety_logs enable row level security;

-- menus (parents/students can view published menus for their school)
do $$ begin
  create policy menus_super_admin_all on menus for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy menus_admin_manage on menus for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy menus_teacher_manage on menus for all using (current_role_name() = 'teacher' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy menus_parent_select on menus for select using (current_role_name() = 'parent' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy menus_student_select on menus for select using (current_role_name() = 'student' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- menu_items (follow the parent menu's visibility)
do $$ begin
  create policy menu_items_super_admin_all on menu_items for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy menu_items_admin_manage on menu_items for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy menu_items_teacher_manage on menu_items for all using (current_role_name() = 'teacher' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy menu_items_parent_select on menu_items for select using (current_role_name() = 'parent' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy menu_items_student_select on menu_items for select using (current_role_name() = 'student' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- meal_eligibility (sensitive — admin/teacher manage, parent/student read own)
do $$ begin
  create policy meal_eligibility_super_admin_all on meal_eligibility for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy meal_eligibility_admin_manage on meal_eligibility for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy meal_eligibility_teacher_manage on meal_eligibility for all using (current_role_name() = 'teacher' and is_my_student(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy meal_eligibility_parent_select on meal_eligibility for select using (current_role_name() = 'parent' and is_my_child(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy meal_eligibility_student_select on meal_eligibility for select using (current_role_name() = 'student' and student_id = current_student_id());
exception when duplicate_object then null; end $$;

-- food_inventory (kitchen/admin-only operational data, no parent/student access)
do $$ begin
  create policy food_inventory_super_admin_all on food_inventory for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy food_inventory_admin_manage on food_inventory for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy food_inventory_teacher_manage on food_inventory for all using (current_role_name() = 'teacher' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- inventory_transactions
do $$ begin
  create policy inventory_transactions_super_admin_all on inventory_transactions for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy inventory_transactions_admin_manage on inventory_transactions for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy inventory_transactions_teacher_manage on inventory_transactions for all using (current_role_name() = 'teacher' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- food_suppliers
do $$ begin
  create policy food_suppliers_super_admin_all on food_suppliers for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy food_suppliers_admin_manage on food_suppliers for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy food_suppliers_teacher_manage on food_suppliers for select using (current_role_name() = 'teacher' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- purchase_orders
do $$ begin
  create policy purchase_orders_super_admin_all on purchase_orders for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy purchase_orders_admin_manage on purchase_orders for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy purchase_orders_teacher_manage on purchase_orders for select using (current_role_name() = 'teacher' and school_id = current_school_id());
exception when duplicate_object then null; end $$;

-- food_safety_logs
do $$ begin
  create policy food_safety_logs_super_admin_all on food_safety_logs for all using (current_role_name() = 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy food_safety_logs_admin_manage on food_safety_logs for all using (current_role_name() = 'school_admin' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy food_safety_logs_teacher_manage on food_safety_logs for all using (current_role_name() = 'teacher' and school_id = current_school_id());
exception when duplicate_object then null; end $$;
