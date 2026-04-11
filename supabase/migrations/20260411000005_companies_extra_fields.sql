-- Add fields from local Company interface
-- that are missing from the Supabase companies table

alter table public.companies
  add column if not exists currency      text not null default 'EUR',
  add column if not exists tax_residency text not null default 'BG',
  add column if not exists is_offshore   boolean not null default false,
  add column if not exists notes         text not null default '',
  add column if not exists color         text not null default '#00966E',
  add column if not exists has_employees boolean not null default false;

-- migration_completed_at: tracks if localStorage
-- data has been imported for this user's account
alter table public.client_accounts
  add column if not exists migration_completed_at timestamptz;

comment on column public.client_accounts.migration_completed_at is
  'Set after localStorage data is successfully imported
   to Supabase. Prevents double-import.';
