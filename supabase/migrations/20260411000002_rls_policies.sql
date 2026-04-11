-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — RLS Policies
-- Migration: 20260411000002_rls_policies
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table owners enable row level security;
alter table client_accounts enable row level security;
alter table client_account_members enable row level security;
alter table companies enable row level security;
alter table company_members enable row level security;
alter table company_subscriptions enable row level security;
alter table transactions enable row level security;
alter table transaction_approvals enable row level security;
alter table journal_batches enable row level security;
alter table journal_lines enable row level security;
alter table employees enable row level security;
alter table payroll_runs enable row level security;
alter table documents enable row level security;
alter table document_acknowledgements enable row level security;
alter table llm_credentials enable row level security;
alter table audit_events enable row level security;

-- ─────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────

-- Check if current user is superadmin or superuser
create or replace function is_super()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('superadmin', 'superuser')
  );
$$;

-- Check if current user is member of a client account
create or replace function is_account_member(account_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from client_account_members
    where client_account_id = account_id
    and profile_id = auth.uid()
    and status = 'active'
  );
$$;

-- Check if current user has specific role in client account
create or replace function account_role(account_id uuid)
returns user_role language sql security definer as $$
  select role from client_account_members
  where client_account_id = account_id
  and profile_id = auth.uid()
  and status = 'active'
  limit 1;
$$;

-- Check if current user is member of a company
create or replace function is_company_member(cid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1
    from company_members cm
    where cm.company_id = cid
    and cm.profile_id = auth.uid()
    and cm.status = 'active'
  )
  or exists (
    -- account-level members also have company access
    select 1
    from client_account_members cam
    join companies c on c.client_account_id = cam.client_account_id
    where c.id = cid
    and cam.profile_id = auth.uid()
    and cam.status = 'active'
  );
$$;

-- ─────────────────────────────────────────────────────────
-- PROFILES
-- Users see only their own profile
-- Superadmin/superuser see all
-- ─────────────────────────────────────────────────────────

create policy "profiles_select_own"
  on profiles for select
  using (id = auth.uid() or is_super());

create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid() or is_super());

create policy "profiles_insert"
  on profiles for insert
  with check (id = auth.uid());

-- ─────────────────────────────────────────────────────────
-- CLIENT ACCOUNTS
-- Members see their accounts
-- Superadmin sees all
-- ─────────────────────────────────────────────────────────

create policy "client_accounts_select"
  on client_accounts for select
  using (is_super() or is_account_member(id));

create policy "client_accounts_insert"
  on client_accounts for insert
  with check (is_super() or exists (
    select 1 from owners
    where owners.id = owner_id
    and owners.linked_profile_id = auth.uid()
  ));

create policy "client_accounts_update"
  on client_accounts for update
  using (is_super() or (
    is_account_member(id)
    and account_role(id) in ('owner', 'accountant')
  ));

-- ─────────────────────────────────────────────────────────
-- COMPANIES
-- Account members see their companies
-- ─────────────────────────────────────────────────────────

create policy "companies_select"
  on companies for select
  using (is_super() or is_account_member(client_account_id));

create policy "companies_insert"
  on companies for insert
  with check (is_super() or (
    is_account_member(client_account_id)
    and account_role(client_account_id) in ('owner', 'accountant')
  ));

create policy "companies_update"
  on companies for update
  using (is_super() or (
    is_account_member(client_account_id)
    and account_role(client_account_id) in ('owner', 'accountant')
  ));

-- ─────────────────────────────────────────────────────────
-- TRANSACTIONS
-- Company members see transactions
-- Director can create (status=pending_approval)
-- Accountant/owner can approve
-- ─────────────────────────────────────────────────────────

create policy "transactions_select"
  on transactions for select
  using (is_super() or is_company_member(company_id));

create policy "transactions_insert"
  on transactions for insert
  with check (is_super() or is_company_member(company_id));

create policy "transactions_update"
  on transactions for update
  using (is_super() or is_company_member(company_id));

-- ─────────────────────────────────────────────────────────
-- JOURNAL (batches + lines)
-- Same access as transactions
-- ─────────────────────────────────────────────────────────

create policy "journal_batches_select"
  on journal_batches for select
  using (is_super() or is_company_member(company_id));

create policy "journal_batches_insert"
  on journal_batches for insert
  with check (is_super() or is_company_member(company_id));

create policy "journal_lines_select"
  on journal_lines for select
  using (is_super() or exists (
    select 1 from journal_batches jb
    where jb.id = batch_id
    and is_company_member(jb.company_id)
  ));

create policy "journal_lines_insert"
  on journal_lines for insert
  with check (is_super() or exists (
    select 1 from journal_batches jb
    where jb.id = batch_id
    and is_company_member(jb.company_id)
  ));

-- ─────────────────────────────────────────────────────────
-- EMPLOYEES
-- ─────────────────────────────────────────────────────────

create policy "employees_select"
  on employees for select
  using (is_super() or is_company_member(company_id));

create policy "employees_insert"
  on employees for insert
  with check (is_super() or is_company_member(company_id));

create policy "employees_update"
  on employees for update
  using (is_super() or is_company_member(company_id));

-- ─────────────────────────────────────────────────────────
-- DOCUMENTS
-- Account members see documents of their account
-- ─────────────────────────────────────────────────────────

create policy "documents_select"
  on documents for select
  using (is_super() or is_account_member(client_account_id));

create policy "documents_insert"
  on documents for insert
  with check (is_super() or is_account_member(client_account_id));

-- ─────────────────────────────────────────────────────────
-- LLM CREDENTIALS
-- NEVER readable by normal users — Edge Functions only
-- Superadmin can read for diagnostics
-- ─────────────────────────────────────────────────────────

create policy "llm_credentials_superadmin_only"
  on llm_credentials for select
  using (exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'superadmin'
  ));

create policy "llm_credentials_insert_own"
  on llm_credentials for insert
  with check (profile_id = auth.uid());

create policy "llm_credentials_update_own"
  on llm_credentials for update
  using (profile_id = auth.uid() or exists (
    select 1 from profiles
    where id = auth.uid() and role = 'superadmin'
  ));

-- ─────────────────────────────────────────────────────────
-- AUDIT EVENTS
-- Append-only: insert for all, never update/delete
-- Select: own events + superadmin sees all
-- ─────────────────────────────────────────────────────────

create policy "audit_events_select"
  on audit_events for select
  using (is_super() or actor_profile_id = auth.uid());

create policy "audit_events_insert"
  on audit_events for insert
  with check (true);  -- any authenticated action can log

-- No update or delete policies — append only
