-- ============================================================================
-- 0027: Fix two bugs in users_self_update stacked across migrations 0022/0023.
--
-- Bug 1 (security hole, confirmed live via pg_policy): migration 0023's
-- "add deleted_at filtering" pass did `drop policy + create policy
-- users_self_update` without WITH CHECK, silently deleting the
-- role <> 'super_admin' escalation guard that 0022 had added. Right now any
-- authenticated user can PATCH their own role to super_admin directly.
--
-- Bug 2 (functional bug, found while debugging onboarding): 0022's original
-- WITH CHECK tried to express "school_id can only be set once, from null" as
--   school_id is null or school_id = (select u.school_id from users u where u.id = auth.uid())
-- The subquery runs within the same UPDATE command and always sees the OLD
-- row (Postgres command-level snapshot), so this can never be satisfied for
-- the one transition it's meant to allow (null -> uuid). Even if bug 1 had
-- never happened, onboarding would still have been broken by this. Moved to
-- a BEFORE UPDATE trigger, which has unambiguous OLD/NEW access.
-- ============================================================================

drop policy if exists users_self_update on users;
create policy users_self_update on users for update
  using (id = auth.uid() and deleted_at is null)
  with check (
    id = auth.uid()
    and deleted_at is null
    and role <> 'super_admin'
  );

create or replace function enforce_school_id_set_once()
returns trigger
language plpgsql
as $$
begin
  if old.school_id is not null and new.school_id is distinct from old.school_id then
    raise exception 'school_id cannot be changed once set';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_school_id_set_once on users;
create trigger trg_users_school_id_set_once
  before update on users
  for each row execute function enforce_school_id_set_once();
