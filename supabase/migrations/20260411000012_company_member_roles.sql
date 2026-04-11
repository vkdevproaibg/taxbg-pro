-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Company member roles (director / accountant flags)
-- Migration: 20260411000012_company_member_roles
-- ═══════════════════════════════════════════════════════════

-- ── Add role flags to company_members ────────────────────

alter table company_members
  add column if not exists is_director   boolean not null default false,
  add column if not exists is_accountant boolean not null default false;

-- Back-fill: existing 'director' role rows → is_director = true
update company_members
  set is_director = true
  where role = 'director';

-- ── Widen closed_periods_insert policy ───────────────────
-- Now that is_accountant / is_director exist, replace the
-- director-only policy from migration 11 with the full one.

drop policy if exists "closed_periods_insert" on closed_periods;

create policy "closed_periods_insert"
  on closed_periods for insert
  with check (is_super() or (
    is_company_member(company_id) and
    exists (
      select 1 from company_members
      where company_id = closed_periods.company_id
        and profile_id = auth.uid()
        and (is_accountant = true or is_director = true)
        and status = 'active'
    )
  ));

-- ── Index for role lookups ────────────────────────────────

create index if not exists idx_company_members_roles
  on company_members(company_id, profile_id)
  where status = 'active';

comment on column company_members.is_director is
  'Can create transactions, view all data. '
  'Changes go to pending_approval if accountant exists separately.';

comment on column company_members.is_accountant is
  'Can confirm/reject transactions, edit journal entries, '
  'close periods. If is_director=true AND is_accountant=true '
  'then this person acts as both (combined role).';
