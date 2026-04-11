-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Triggers
-- Migration: 20260411000003_triggers
-- ═══════════════════════════════════════════════════════════

-- Auto-create profile when user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, role, language)
  values (
    new.id,
    'free',
    coalesce(new.raw_user_meta_data->>'language', 'ru')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update updated_at timestamps
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

create trigger companies_updated_at
  before update on companies
  for each row execute procedure update_updated_at();

create trigger transactions_updated_at
  before update on transactions
  for each row execute procedure update_updated_at();

create trigger employees_updated_at
  before update on employees
  for each row execute procedure update_updated_at();
