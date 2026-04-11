-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Session 3: Tax rate versioning
-- Migration: 20260411000014_tax_rate_versions
--
-- Purpose: store time-dependent tax rates so that calculations
-- can use the rate effective on a specific operation date
-- (not the current date). Each rate change creates a new row
-- rather than overwriting the previous value.
-- ═══════════════════════════════════════════════════════════

create table tax_rate_versions (
  id              uuid primary key default uuid_generate_v4(),
  rate_key        text not null,
  value           numeric(12,6) not null,
  effective_from  date not null,
  effective_to    date,
  legal_basis     text not null,
  dv_issue        text,
  published_at    date,
  notes_bg        text,
  notes_ru        text,
  confirmed_by    uuid references profiles(id),
  confirmed_at    timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique(rate_key, effective_from)
);

alter table tax_rate_versions enable row level security;

create policy "tax_rate_versions_select"
  on tax_rate_versions for select
  using (true);

create policy "tax_rate_versions_insert"
  on tax_rate_versions for insert
  with check (is_super());

create policy "tax_rate_versions_update"
  on tax_rate_versions for update
  using (is_super());

create index idx_tax_rate_versions_key_date
  on tax_rate_versions(rate_key, effective_from desc);
