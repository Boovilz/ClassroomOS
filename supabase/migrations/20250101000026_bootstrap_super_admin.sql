-- ============================================================================
-- 0026: First-run super_admin bootstrap.
--
-- Self-escalation to super_admin is blocked by the users_self_update RLS
-- policy (0022) - by design, an ordinary authenticated user cannot PATCH
-- their own role to super_admin. Until now the only way to create the first
-- super_admin was a manual `update public.users set role = 'super_admin'`
-- run by whoever holds the Supabase project's SQL Editor access.
--
-- This adds a narrow, self-limiting exception: any authenticated user may
-- call claim_super_admin() to promote themselves, but ONLY while zero
-- super_admin rows exist anywhere in the system. The moment one exists, the
-- function permanently refuses for everyone else - it cannot be used to mint
-- additional super_admins, only the very first one.
-- ============================================================================

create or replace function claim_super_admin()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.users where role = 'super_admin') then
    raise exception 'A super_admin already exists; bootstrap is no longer available.';
  end if;

  update public.users
  set role = 'super_admin'
  where id = auth.uid();

  if not found then
    raise exception 'No matching users row for the current session.';
  end if;

  insert into public.audit_logs (actor_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'update', 'users', auth.uid(), jsonb_build_object('event', 'bootstrap_super_admin'));
end;
$$;

revoke all on function claim_super_admin() from public;
grant execute on function claim_super_admin() to authenticated;
