-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Stages 5-8: Group relations, integrations, learning
-- Migration: 20260411000009_stages5to8
-- ═══════════════════════════════════════════════════════════

-- ── Stage 5: Company relations ───────────────────────────

create table if not exists company_relations (
  id                uuid primary key default uuid_generate_v4(),
  client_account_id uuid not null
                    references client_accounts(id) on delete cascade,
  from_company_id   uuid not null references companies(id) on delete cascade,
  to_company_id     uuid not null references companies(id) on delete cascade,
  type              text not null check (type in (
                      'parent', 'subsidiary', 'partner',
                      'offshore', 'branch'
                    )),
  ownership_pct     numeric(5,2) check (
                      ownership_pct >= 0 and ownership_pct <= 100
                    ),
  purpose           text,
  annual_flow       numeric(12,2),
  notes             text not null default '',
  created_at        timestamptz not null default now(),
  unique(from_company_id, to_company_id, type)
);

alter table company_relations enable row level security;

create policy "company_relations_select"
  on company_relations for select
  using (is_super() or is_account_member(client_account_id));

create policy "company_relations_insert"
  on company_relations for insert
  with check (is_super() or (
    is_account_member(client_account_id) and
    account_role(client_account_id) in ('owner', 'accountant')
  ));

create policy "company_relations_update"
  on company_relations for update
  using (is_super() or (
    is_account_member(client_account_id) and
    account_role(client_account_id) in ('owner', 'accountant')
  ));

create policy "company_relations_delete"
  on company_relations for delete
  using (is_super() or (
    is_account_member(client_account_id) and
    account_role(client_account_id) in ('owner', 'accountant')
  ));

create index if not exists idx_company_relations_account
  on company_relations(client_account_id);

create index if not exists idx_company_relations_from
  on company_relations(from_company_id);

create index if not exists idx_company_relations_to
  on company_relations(to_company_id);

comment on table company_relations is
  'Inter-company relations within one client account. '
  'parent/subsidiary/partner/offshore/branch. '
  'Both companies must belong to the same client_account.';

-- ── Stage 7: Integrations (sensitive data, obfuscated) ───

create table if not exists user_integrations (
  id                uuid primary key default uuid_generate_v4(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  -- Non-sensitive config stored as plain JSONB
  nap_config        jsonb,
  email_config      jsonb,
  pik_config        jsonb,
  -- Sensitive values obfuscated client-side
  -- Production: replace with Edge Function + pgcrypto encryption
  nap_api_key_enc   text,
  smtp_password_enc text,
  resend_key_enc    text,
  pik_code_enc      text,
  updated_at        timestamptz not null default now(),
  unique(profile_id)
);

alter table user_integrations enable row level security;

create policy "user_integrations_select_own"
  on user_integrations for select
  using (profile_id = auth.uid() or is_super());

create policy "user_integrations_insert_own"
  on user_integrations for insert
  with check (profile_id = auth.uid());

create policy "user_integrations_update_own"
  on user_integrations for update
  using (profile_id = auth.uid() or is_super());

comment on table user_integrations is
  'User integration settings. Sensitive values (API keys, '
  'passwords) stored obfuscated. Non-sensitive config in JSONB. '
  'SECURITY: _enc columns should only be decrypted server-side.';

-- ── Stage 8: Learning progress ────────────────────────────

alter table profiles
  add column if not exists completed_lessons   jsonb not null default '[]',
  add column if not exists learning_updated_at timestamptz;

comment on column profiles.completed_lessons is
  'Array of completed lesson IDs, e.g. ["l1-1", "l1-2"]. '
  'Synced from learningStore on login.';

-- ── Misc: audit_events entity index ──────────────────────

create index if not exists idx_audit_events_entity
  on audit_events(entity_type, entity_id);