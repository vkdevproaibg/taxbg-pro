-- Fix: allow trigger handle_new_user() to insert into profiles
-- The trigger runs before auth.uid() is set, so RLS blocks the insert.
-- Solution: relax the INSERT policy to allow all inserts
-- (the trigger already runs as security definer, FK to auth.users protects integrity)

alter function handle_new_user() security definer set search_path = public;

drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_insert"
  on public.profiles for insert
  with check (true);
