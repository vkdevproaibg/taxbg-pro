-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Session 6: Correction reports
-- Migration: 20260411000017_correction_reports
--
-- Purpose: when a superadmin applies a tax rate with
-- effective_from in the past, the system detects the affected
-- closed periods per company and writes one correction_reports
-- row. Nothing is posted automatically — a human confirms each
-- row, which then generates a correcting journal batch in the
-- current period (НСС 8).
-- ═══════════════════════════════════════════════════════════

create table correction_reports (
  id                    uuid primary key default uuid_generate_v4(),
  company_id            uuid not null references companies(id) on delete cascade,
  trigger_type          text not null
                          check (trigger_type in ('rate_change', 'manual', 'audit_finding')),
  trigger_rate_key      text,
  trigger_alert_id      uuid references legislation_alerts(id),
  affected_from         date not null,
  affected_to           date not null,
  old_values_json       jsonb not null,
  new_values_json       jsonb not null,
  difference_json       jsonb not null,
  total_difference      numeric(12,2) not null,
  status                text not null default 'pending'
                          check (status in ('pending', 'confirmed', 'dismissed')),
  confirmed_by          uuid references profiles(id),
  confirmed_at          timestamptz,
  dismiss_reason        text,
  correction_batch_id   uuid references journal_batches(id),
  created_at            timestamptz not null default now()
);

alter table correction_reports enable row level security;

create policy "correction_reports_select"
  on correction_reports for select
  using (is_super() or is_company_member(company_id));

create policy "correction_reports_insert"
  on correction_reports for insert
  with check (is_super());

create policy "correction_reports_update"
  on correction_reports for update
  using (is_super());

create index idx_correction_reports_company
  on correction_reports(company_id, status);
