-- ============================================================================
-- 0022: Onboarding - auto-create a public.users profile row on signup, and
-- let a first-time user (one with no school_id yet) create their own school
-- and become its school_admin.
--
-- Root cause fixed here: registration (src/app/(auth)/register/page.tsx) only
-- ever calls supabase.auth.signUp(), which creates an auth.users row. Nothing
-- previously created the matching public.users row or assigned a school_id,
-- so every school-scoped feature (e.g. "เพิ่มนักเรียน" on /students) silently
-- had nothing to attach to and never rendered.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Auto-create a public.users profile whenever a new auth.users row appears
-- (covers both email/password signUp and OAuth signups).
-- ----------------------------------------------------------------------------
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'teacher'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- Let an onboarding user (no school_id yet) create exactly one school. App
-- code (onboarding page) then updates their own users.school_id/role via the
-- existing users_self_update policy.
-- ----------------------------------------------------------------------------
do $$ begin
  create policy schools_onboarding_insert on schools for insert
    with check (
      exists (select 1 from users u where u.id = auth.uid() and u.school_id is null)
    );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Tighten users_self_update: previously had no WITH CHECK, so it implicitly
-- reused the USING clause (id = auth.uid()) for validation too - meaning any
-- authenticated user could PATCH their own row to role='super_admin' via a
-- direct REST call. Replace it with a version that still lets onboarding set
-- school_id/role once (from null), but blocks self-escalation to super_admin
-- and blocks re-assigning an already-set school_id.
-- ----------------------------------------------------------------------------
drop policy if exists users_self_update on users;
create policy users_self_update on users for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role <> 'super_admin'
    and (
      school_id is null
      or school_id = (select u.school_id from users u where u.id = auth.uid())
    )
  );
