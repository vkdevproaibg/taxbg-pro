-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Manual journal editing support
-- Migration: 20260411000011_manual_editing
-- ═══════════════════════════════════════════════════════════

-- ── Journal lines: manual editing metadata ───────────────

alter table journal_lines
  add column if not exists is_manually_edited  boolean      not null default false,
  add column if not exists original_debit      numeric(12,2),
  add column if not exists original_credit     numeric(12,2),
  add column if not exists original_account    text,
  add column if not exists edited_by           uuid         references profiles(id),
  add column if not exists edited_at           timestamptz,
  add column if not exists edit_reason         text;

comment on column journal_lines.is_manually_edited is
  'True when a line was edited after auto-generation. '
  'original_* columns hold the pre-edit values.';

comment on column journal_lines.edit_reason is
  'Required justification for manual edits (НСС 8 compliance).';

-- ── Transactions: manual adjustment metadata ─────────────

alter table transactions
  add column if not exists is_manually_adjusted boolean      not null default false,
  add column if not exists adjusted_by          uuid         references profiles(id),
  add column if not exists adjusted_at          timestamptz,
  add column if not exists adjustment_note      text;

comment on column transactions.is_manually_adjusted is
  'True when the transaction amount or type was manually corrected.';

-- ── Closed periods ────────────────────────────────────────
-- Blocks editing of past accounting periods.
-- Corrections in closed periods require a storno entry (НСС 8).

create table if not exists closed_periods (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references companies(id) on delete cascade,
  period_year   int  not null,
  period_month  int  check (period_month between 1 and 12),
  -- NULL period_month = entire year is closed
  closed_by     uuid references profiles(id),
  closed_at     timestamptz not null default now(),
  notes         text,
  unique(company_id, period_year, period_month)
);

alter table closed_periods enable row level security;

create policy "closed_periods_select"
  on closed_periods for select
  using (is_super() or is_company_member(company_id));

-- NOTE: uses role = 'director' because is_director/is_accountant
-- columns are added in migration 20260411000012_company_member_roles.
-- Policy is widened there to include is_accountant = true.
create policy "closed_periods_insert"
  on closed_periods for insert
  with check (is_super() or (
    is_company_member(company_id) and
    exists (
      select 1 from company_members
      where company_id = closed_periods.company_id
        and profile_id = auth.uid()
        and role = 'director'
        and status = 'active'
    )
  ));

comment on table closed_periods is
  'Tracks closed accounting periods per company. '
  'Closed periods cannot be directly edited — '
  'corrections require a storno entry in НСС 8.';

comment on column closed_periods.period_month is
  'NULL = entire year closed. '
  '1-12 = specific month closed.';
