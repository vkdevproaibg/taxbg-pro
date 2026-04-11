-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Initial Schema
-- Migration: 20260411000001_initial_schema
-- ════════════════════════════════════════════════════════

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────

create type user_role as enum (
  'superadmin',
  'superuser',
  'owner',
  'accountant',
  'director',
  'payroll_manager',
  'viewer',
  'free'
);

create type member_status as enum (
  'invited',
  'active',
  'revoked'
);

create type company_status as enum (
  'draft',
  'active',
  'archived',
  'closed'
);

create type legal_form as enum (
  'ood',   -- ООД / ЕООД
  'et',    -- ЕТ
  'self'   -- Самоосигуряващ се
);

create type subscription_plan as enum (
  'free',
  'pro'
);

create type subscription_status as enum (
  'active',
  'past_due',
  'cancelled',
  'trialing'
);

create type transaction_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'rejected'
);

create type approval_action as enum (
  'submitted',
  'approved',
  'rejected',
  'returned'
);

create type retention_class as enum (
  'payroll_50y',
  'accounting_10y',
  'tax_control_extended',
  'general_3y',
  'legal_hold',
  'manual_delete'
);

create type llm_mode as enum (
  'own_key',
  'platform'
);

create type llm_provider as enum (
  'openrouter',
  'openai',
  'anthropic'
);

create type ack_type as enum (
  'download_warning',
  'export_warning',
  'delete_warning',
  'purge_warning'
);

-- ─────────────────────────────────────────────────────────
-- PROFILES
-- Extends auth.users with app-specific fields
-- ─────────────────────────────────────────────────────────

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            user_role not null default 'free',
  language        text not null default 'ru'
                  check (language in ('ru', 'uk', 'en', 'bg')),
  llm_mode        llm_mode not null default 'own_key',
  subscription    subscription_plan not null default 'free',
  full_name       text,
  avatar_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table profiles is
  'App-level user profile extending Supabase auth.users';

-- ─────────────────────────────────────────────────────────
-- OWNERS
-- The root entity — business owner / relocant / founder
-- A client account cannot exist without an owner
-- ─────────────────────────────────────────────────────────

create table owners (
  id                  uuid primary key default uuid_generate_v4(),
  full_name           text not null,
  email               text,
  phone               text,
  country             text not null default 'BG',
  -- nullable: owner may not yet have a system profile
  -- (accountant can create owner record before owner registers)
  linked_profile_id   uuid references profiles(id) on delete set null,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table owners is
  'Business owner entity. Root of the client account tree. '
  'Can exist before the owner registers in the system.';

comment on column owners.linked_profile_id is
  'Set when the owner claims their account by registering. '
  'Nullable — owner record can be created by accountant first.';

-- ─────────────────────────────────────────────────────────
-- CLIENT ACCOUNTS
-- One owner = one client account (their accounting universe)
-- RULE: cannot be activated without at least one company
-- ─────────────────────────────────────────────────────────

create table client_accounts (
  id                          uuid primary key default uuid_generate_v4(),
  owner_id                    uuid not null references owners(id),
  status                      text not null default 'pending'
                              check (status in (
                                'pending',   -- no company yet
                                'active',    -- has at least one company
                                'suspended', -- billing issue
                                'closed'
                              )),
  primary_accountant_id       uuid references profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique(owner_id)             -- one owner = one client account
);

comment on table client_accounts is
  'The accounting universe of one owner. '
  'Contains all their companies, documents, members. '
  'Status becomes active only after first company is created.';

-- ─────────────────────────────────────────────────────────
-- CLIENT ACCOUNT MEMBERS
-- Access control at the account level (not company level)
-- Roles: owner, accountant, viewer
-- Director is handled at company level (company_members)
-- ─────────────────────────────────────────────────────────

create table client_account_members (
  id                  uuid primary key default uuid_generate_v4(),
  client_account_id   uuid not null references client_accounts(id) on delete cascade,
  profile_id          uuid not null references profiles(id) on delete cascade,
  role                user_role not null
                      check (role in ('owner', 'accountant', 'viewer')),
  status              member_status not null default 'invited',
  invited_by          uuid references profiles(id),
  invited_at          timestamptz not null default now(),
  activated_at        timestamptz,
  revoked_at          timestamptz,
  unique(client_account_id, profile_id)
);

comment on table client_account_members is
  'Who has access to a client account and at what level. '
  'An accountant can be member of multiple client accounts. '
  'Director role is NOT here — it lives in company_members.';

-- ─────────────────────────────────────────────────────────
-- COMPANIES
-- One company = one billable unit
-- BILLING: only status=active companies are charged
-- ─────────────────────────────────────────────────────────

create table companies (
  id                  uuid primary key default uuid_generate_v4(),
  client_account_id   uuid not null references client_accounts(id) on delete cascade,
  name                text not null,
  eik                 text,              -- ЕИК / Булстат
  legal_form          legal_form not null default 'ood',
  has_vat             boolean not null default false,
  vat_number          text,              -- BG + EИК
  capital_eur         numeric(12,2) not null default 1.00,
  status              company_status not null default 'draft',
  founded_date        date,
  closed_date         date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table companies is
  'One company = one billable subscription unit. '
  'Billing applies only to status=active companies. '
  'archived/closed companies are not billed but data is retained '
  'per Bulgarian law retention rules.';

-- ─────────────────────────────────────────────────────────
-- COMPANY MEMBERS
-- Access control at the company level
-- Director is assigned here, not at account level
-- One owner can have different directors per company
-- ─────────────────────────────────────────────────────────

create table company_members (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  role            user_role not null
                  check (role in (
                    'director',
                    'payroll_manager',
                    'viewer'
                  )),
  status          member_status not null default 'active',
  assigned_by     uuid references profiles(id),
  assigned_at     timestamptz not null default now(),
  unique(company_id, profile_id)
);

comment on table company_members is
  'Company-level access. Director is assigned per company, '
  'not per client account — different companies can have '
  'different directors even if owned by same person.';

-- ─────────────────────────────────────────────────────────
-- COMPANY SUBSCRIPTIONS
-- One per company, tracks billing status
-- ─────────────────────────────────────────────────────────

create table company_subscriptions (
  id                    uuid primary key default uuid_generate_v4(),
  company_id            uuid not null references companies(id) on delete cascade,
  plan                  subscription_plan not null default 'free',
  status                subscription_status not null default 'active',
  stripe_subscription_id text,
  billing_cycle_start   date,
  billing_cycle_end     date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(company_id)
);

-- ─────────────────────────────────────────────────────────
-- TRANSACTIONS
-- User-facing operations in plain language
-- System auto-creates journal entries from these
-- ─────────────────────────────────────────────────────────

create table transactions (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references companies(id) on delete cascade,
  date                date not null,
  type                text not null,
  amount              numeric(12,2) not null check (amount >= 0),
  description         text not null,
  vat_rate            numeric(4,4) check (vat_rate in (0, 0.09, 0.20)),
  vat_amount          numeric(12,2),
  counterparty        text,
  invoice_number      text,
  -- workflow
  status              transaction_status not null default 'approved',
  created_by          uuid references profiles(id),
  submitted_at        timestamptz,
  approved_at         timestamptz,
  approved_by         uuid references profiles(id),
  rejection_note      text,
  -- platform fees (for appstore/googleplay/stripe)
  gross_amount        numeric(12,2),
  platform_fee        numeric(12,2),
  -- assets
  asset_name          text,
  asset_value         numeric(12,2),
  depreciation_rate   numeric(4,4),
  deductible_percent  numeric(4,4),
  -- misc
  municipality        text,
  is_deferred         boolean default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table transactions is
  'User-facing operations in plain business language. '
  'The system automatically creates journal_batches + '
  'journal_lines from these. Users never see account codes.';

-- ─────────────────────────────────────────────────────────
-- TRANSACTION APPROVALS
-- Immutable history of approval workflow
-- ─────────────────────────────────────────────────────────

create table transaction_approvals (
  id                uuid primary key default uuid_generate_v4(),
  transaction_id    uuid not null references transactions(id) on delete cascade,
  action            approval_action not null,
  by_profile_id     uuid not null references profiles(id),
  note              text,
  created_at        timestamptz not null default now()
);

comment on table transaction_approvals is
  'Immutable audit trail of every approval action. '
  'Never update or delete rows here.';

-- ─────────────────────────────────────────────────────────
-- JOURNAL BATCHES
-- One batch = one business operation (may have multiple lines)
-- Locked batches cannot be modified
-- ─────────────────────────────────────────────────────────

create table journal_batches (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  source_type     text not null
                  check (source_type in (
                    'transaction',
                    'payroll_run',
                    'manual',
                    'opening_balance',
                    'period_close',
                    'correction'
                  )),
  source_id       uuid,  -- references transactions.id or payroll_runs.id
  description     text,
  created_by      uuid references profiles(id),
  locked_at       timestamptz,  -- once locked, lines cannot be changed
  created_at      timestamptz not null default now()
);

comment on table journal_batches is
  'One batch = one accounting operation. '
  'A salary payment creates one batch with 4+ lines. '
  'Locked batches are immutable (period closed).';

-- ─────────────────────────────────────────────────────────
-- JOURNAL LINES
-- Double-entry bookkeeping lines within a batch
-- Each line has either debit OR credit (not both)
-- Sum of debits must equal sum of credits per batch
-- ─────────────────────────────────────────────────────────

create table journal_lines (
  id              uuid primary key default uuid_generate_v4(),
  batch_id        uuid not null references journal_batches(id) on delete cascade,
  account_code    text not null,  -- e.g. '503', '703', '451'
  debit           numeric(12,2) not null default 0 check (debit >= 0),
  credit          numeric(12,2) not null default 0 check (credit >= 0),
  description     text,
  created_at      timestamptz not null default now(),
  -- constraint: each line must have debit OR credit, not both zero
  check (debit > 0 or credit > 0),
  check (not (debit > 0 and credit > 0))
);

comment on table journal_lines is
  'Double-entry lines. Each line is either a debit or credit. '
  'Bulgarian chart of accounts (НСС): 503=bank, 703=revenue, '
  '602=expenses, 451=VAT payable, 102=registered capital, etc.';

-- ─────────────────────────────────────────────────────────
-- EMPLOYEES
-- Master record only — no retention class here
-- Payroll data lives in payroll_runs/payroll_documents
-- ─────────────────────────────────────────────────────────

create table employees (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  full_name       text not null,
  position        text,
  employment_type text check (employment_type in (
    'employee',           -- трудов договор
    'self_insured',       -- самоосигуряващ се (директор)
    'civil_contract'      -- граждански договор
  )),
  gross_salary    numeric(10,2),
  active          boolean not null default true,
  hired_date      date,
  terminated_date date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────
-- PAYROLL RUNS
-- One per pay period. Has 50-year retention.
-- ─────────────────────────────────────────────────────────

create table payroll_runs (
  id                uuid primary key default uuid_generate_v4(),
  company_id        uuid not null references companies(id) on delete cascade,
  period_year       int not null,
  period_month      int not null check (period_month between 1 and 12),
  status            text not null default 'draft'
                    check (status in ('draft', 'confirmed', 'archived')),
  total_gross       numeric(12,2),
  total_net         numeric(12,2),
  total_employer_osig numeric(12,2),
  -- Retention: ведомости зарплат хранятся 50 лет
  -- retain_until = 30 June of (period_year + 51)
  retention_class   retention_class not null default 'payroll_50y',
  retain_until      date not null
                    generated always as (
                      make_date(period_year + 51, 6, 30)
                    ) stored,
  legal_basis       text not null default 'ЗСч чл. 47; МЛСП наредба',
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now()
);

comment on column payroll_runs.retain_until is
  'Auto-computed: 30 June of (period_year + 51). '
  'Formula: retain_until = 30 June next year after (period + 50 years). '
  'Example: payroll for 2026 → retained until 30.06.2077.';

-- ─────────────────────────────────────────────────────────
-- DOCUMENTS
-- Central table for ALL files in the system
-- Files live in Supabase Storage
-- Documents can belong to account, company, or employee
-- ─────────────────────────────────────────────────────────

create table documents (
  id                    uuid primary key default uuid_generate_v4(),
  -- ownership (at least client_account_id is always set)
  client_account_id     uuid not null references client_accounts(id),
  company_id            uuid references companies(id),
  employee_id           uuid references employees(id),
  -- entity that generated this document
  source_entity_type    text check (source_entity_type in (
    'transaction', 'payroll_run', 'company',
    'employee', 'owner', 'manual'
  )),
  source_entity_id      uuid,
  -- file metadata
  file_name             text not null,
  mime_type             text not null,
  storage_path          text not null,  -- path in Supabase Storage
  file_size_bytes       bigint,
  checksum              text,           -- sha256 of file
  document_type         text not null,  -- 'gfo', 'zkpo_decl', 'dds_decl',
                                        -- 'invoice', 'payslip', 'contract',
                                        -- 'passport', 'visa', 'other'
  -- retention
  retention_class       retention_class not null,
  -- retain_until: max of all applicable rules
  -- Formula: 30 June of (upload_year + retention_years + 1)
  retain_until          date not null,
  legal_basis           text not null,  -- 'ЗСч чл. 47', 'ДОПК чл. 38', etc.
  -- lifecycle
  uploaded_by           uuid references profiles(id),
  is_archived           boolean not null default false,
  is_legal_hold         boolean not null default false,
  archived_at           timestamptz,
  deleted_at            timestamptz,    -- logical delete, file may still exist
  purged_at             timestamptz,    -- file physically removed from storage
  -- purge notifications sent
  notified_90d          boolean not null default false,
  notified_30d          boolean not null default false,
  notified_7d           boolean not null default false,
  created_at            timestamptz not null default now()
);

comment on table documents is
  'Central document table. All files regardless of type. '
  'Files stored in Supabase Storage, metadata here. '
  'retain_until = max(all applicable Bulgarian law retention rules). '
  'Formula: 30 June of (document_year + retention_years + 1). '
  'Example: accounting doc from 2026 → retain until 30.06.2037. '
  'WE STORE MAX 1 YEAR on our servers. User must download and '
  'keep their own copy for legally required retention periods. '
  'See document_acknowledgements for download confirmation log.';

-- ─────────────────────────────────────────────────────────
-- DOCUMENT ACKNOWLEDGEMENTS
-- Legal proof that user saw and confirmed the warning
-- Required for documents with retention_class != general_3y
-- ─────────────────────────────────────────────────────────

create table document_acknowledgements (
  id                    uuid primary key default uuid_generate_v4(),
  document_id           uuid not null references documents(id),
  profile_id            uuid not null references profiles(id),
  ack_type              ack_type not null,
  -- snapshot of warning text shown to user at time of ack
  warning_text_shown    text not null,
  -- snapshot of legal basis at time of ack
  legal_basis_snapshot  text not null,
  -- snapshot of retain_until shown to user
  retain_until_shown    date not null,
  -- our storage disclaimer shown to user
  storage_disclaimer    text not null default
    'TaxBG Pro обеспечивает хранение на своих серверах не более 1 года. '
    'Ответственность за хранение в течение срока, установленного '
    'болгарским законодательством, лежит на руководителе предприятия.',
  acknowledged_at       timestamptz not null default now(),
  request_id            text         -- correlation id for audit
);

comment on table document_acknowledgements is
  'Legal proof of user confirmation before downloading documents '
  'with long retention requirements. '
  'Never delete rows from this table. Append-only.';

-- ─────────────────────────────────────────────────────────
-- LLM CREDENTIALS
-- User API keys for own-key LLM mode
-- NEVER exposed to frontend — server functions only
-- ─────────────────────────────────────────────────────────

create table llm_credentials (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  provider        llm_provider not null,
  -- key encrypted with pgcrypto — never stored in plaintext
  encrypted_key   text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(profile_id, provider)
);

comment on table llm_credentials is
  'User LLM API keys. Encrypted at rest. '
  'SECURITY: Accessible only via Edge Functions. '
  'RLS: this table has NO select policy for authenticated users. '
  'Frontend never reads this table directly.';

-- ─────────────────────────────────────────────────────────
-- AUDIT EVENTS
-- Immutable append-only log of all significant actions
-- before_json / after_json capture state changes
-- ─────────────────────────────────────────────────────────

create table audit_events (
  id                  uuid primary key default uuid_generate_v4(),
  actor_profile_id    uuid references profiles(id),
  client_account_id   uuid references client_accounts(id),
  company_id          uuid references companies(id),
  entity_type         text not null,  -- 'transaction', 'company', 'employee'...
  entity_id           uuid,
  action              text not null,  -- 'created', 'updated', 'deleted',
                                      -- 'approved', 'rejected', 'downloaded'
  before_json         jsonb,
  after_json          jsonb,
  request_id          text,
  ip_address          text,
  user_agent          text,
  created_at          timestamptz not null default now()
);

comment on table audit_events is
  'Append-only audit log. NEVER update or delete rows. '
  'Captures all significant actions with before/after state. '
  'Used for: debugging, compliance, superadmin diagnostics.';

-- ─────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────

create index idx_companies_client_account
  on companies(client_account_id);

create index idx_transactions_company_date
  on transactions(company_id, date desc);

create index idx_transactions_status
  on transactions(company_id, status);

create index idx_journal_batches_company
  on journal_batches(company_id);

create index idx_journal_lines_batch
  on journal_lines(batch_id);

create index idx_journal_lines_account
  on journal_lines(account_code);

create index idx_employees_company
  on employees(company_id, active);

create index idx_documents_client_account
  on documents(client_account_id);

create index idx_documents_company
  on documents(company_id);

create index idx_documents_retain_until
  on documents(retain_until)
  where purged_at is null;

create index idx_audit_events_actor
  on audit_events(actor_profile_id, created_at desc);

create index idx_audit_events_company
  on audit_events(company_id, created_at desc);

create index idx_client_account_members_profile
  on client_account_members(profile_id);
