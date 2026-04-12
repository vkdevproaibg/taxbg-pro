-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Company transfer (sale / inheritance / gift)
-- Migration: 20260411000018_company_transfers
--
-- Purpose: log company share transfers. When an owner sells a
-- company (ЕООД), the EIK stays the same and the new owner
-- inherits the whole history. The outgoing owner still has the
-- right to keep documents covering their management period
-- for the ДОПК 5-year давностен срок.
--
-- Transfer types:
--   full_sale     — 100% sale, outgoing owner loses access
--   partial_sale  — partial sale, both owners keep access
--   inheritance   — death of owner
--   gift          — donation of shares
-- ═══════════════════════════════════════════════════════════

create table company_transfers (
  id                        uuid primary key default uuid_generate_v4(),
  company_id                uuid not null references companies(id) on delete cascade,

  transfer_type             text not null check (transfer_type in (
    'full_sale',
    'partial_sale',
    'inheritance',
    'gift'
  )),

  -- Parties
  from_owner_id             uuid references owners(id),
  from_profile_id           uuid references profiles(id),
  to_email                  text,
  to_profile_id             uuid references profiles(id),

  -- Shares
  shares_transferred_pct    numeric(5,2) not null
                              check (shares_transferred_pct > 0
                                 and shares_transferred_pct <= 100),

  -- Seller's management period (defines which documents go into
  -- their archive for tax protection — ДОПК чл. 109, 5 years)
  seller_management_from    date,
  seller_management_to      date,

  -- Registry / notary
  transfer_date             date not null,
  notary_act_number         text,
  registry_entry            text,

  -- Archiving
  seller_archive_generated  boolean not null default false,
  seller_archive_downloaded boolean not null default false,
  seller_archive_url        text,

  -- Access
  seller_access_revoked     boolean not null default false,
  seller_access_revoked_at  timestamptz,

  status                    text not null default 'draft' check (status in (
    'draft',
    'pending_buyer',
    'archive_ready',
    'completed',
    'cancelled'
  )),

  notes                     text,
  created_by                uuid references profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table company_transfers is
  'Journal of company share transfers. full_sale revokes seller '
  'access after archive download. partial_sale keeps seller access '
  'and adds the buyer as an additional member.';

alter table company_transfers enable row level security;

-- Seller, buyer (by id or by pending email), company member,
-- and superadmin can read.
create policy "company_transfers_select" on company_transfers
  for select using (
    is_super()
    or from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
    or (to_email is not null and to_email = (auth.jwt() ->> 'email'))
    or is_company_member(company_id)
  );

-- Only the outgoing owner (or super) can create a transfer.
create policy "company_transfers_insert" on company_transfers
  for insert with check (
    is_super()
    or from_profile_id = auth.uid()
  );

-- Seller can update their draft / archive flags;
-- buyer can update to claim the transfer (fills to_profile_id).
create policy "company_transfers_update" on company_transfers
  for update using (
    is_super()
    or from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
    or (to_email is not null and to_email = (auth.jwt() ->> 'email'))
  );

create index idx_company_transfers_company
  on company_transfers(company_id);

create index idx_company_transfers_status
  on company_transfers(status);

create index idx_company_transfers_to_email
  on company_transfers(lower(to_email))
  where to_email is not null and status = 'pending_buyer';

create trigger company_transfers_updated_at
  before update on company_transfers
  for each row execute procedure update_updated_at();
