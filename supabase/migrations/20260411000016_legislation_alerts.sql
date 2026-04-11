-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Session 5: Legislation alerts
-- Migration: 20260411000016_legislation_alerts
--
-- Purpose: queue of detected or manually registered legislative
-- changes that may affect tax rates. Superadmin reviews each
-- alert and, when applying it, creates new rows in
-- tax_rate_versions. Only superadmin can see/edit alerts.
-- ═══════════════════════════════════════════════════════════

create table legislation_alerts (
  id                        uuid primary key default uuid_generate_v4(),
  source                    text not null
                              check (source in ('dv', 'nap', 'noi', 'kik-info', 'manual')),
  source_url                text,
  title                     text not null,
  summary_bg                text,
  summary_ru                text,
  detected_keywords         text[],
  affected_rate_keys        text[],
  status                    text not null default 'pending'
                              check (status in ('pending', 'reviewing', 'applied', 'dismissed')),
  reviewed_by               uuid references profiles(id),
  reviewed_at               timestamptz,
  review_notes              text,
  applied_rate_version_ids  uuid[],
  created_at                timestamptz not null default now()
);

alter table legislation_alerts enable row level security;

create policy "legislation_alerts_select"
  on legislation_alerts for select
  using (is_super());

create policy "legislation_alerts_insert"
  on legislation_alerts for insert
  with check (is_super());

create policy "legislation_alerts_update"
  on legislation_alerts for update
  using (is_super());

create index idx_legislation_alerts_status
  on legislation_alerts(status, created_at desc);

comment on table legislation_alerts is
  'Сигнали за промени в законодателството. Само superadmin вижда и обработва. '
  'Статус pending → reviewing → applied/dismissed. '
  'При applied се създават нови записи в tax_rate_versions.';
