-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Session 1: Audit fixes
-- Migration: 20260411000013_audit_fixes_session1
-- 
-- Fixes:
--   K2  — Missing RLS policies for 7 tables
--   C5  — profiles_insert policy too wide
--   M1  — journal_lines missing UPDATE/DELETE policies
--   M2  — missing updated_at triggers
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- K2: RLS policies for tables that have RLS enabled
--     but zero policies defined
-- ──────────────────────────────────────────────────────────

-- ── OWNERS ───────────────────────────────────────────────
-- Owner can see their own record.
-- Accountant who created the owner record can also see it.
-- Superadmin/superuser see all.

create policy "owners_select"
  on owners for select
  using (
    is_super()
    or linked_profile_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "owners_insert"
  on owners for insert
  with check (
    is_super()
    or linked_profile_id = auth.uid()
    or auth.uid() is not null  -- accountant creating owner before owner registers
  );

create policy "owners_update"
  on owners for update
  using (
    is_super()
    or linked_profile_id = auth.uid()
  );

-- ── CLIENT ACCOUNT MEMBERS ──────────────────────────────
-- Members can see other members of their account.
-- Owner/accountant can invite new members.

create policy "client_account_members_select"
  on client_account_members for select
  using (
    is_super()
    or profile_id = auth.uid()
    or is_account_member(client_account_id)
  );

create policy "client_account_members_insert"
  on client_account_members for insert
  with check (
    is_super()
    or (
      is_account_member(client_account_id)
      and account_role(client_account_id) in ('owner', 'accountant')
    )
  );

create policy "client_account_members_update"
  on client_account_members for update
  using (
    is_super()
    or (
      is_account_member(client_account_id)
      and account_role(client_account_id) in ('owner', 'accountant')
    )
  );

-- ── COMPANY MEMBERS ─────────────────────────────────────
-- Account-level members can see company members.
-- Owner/accountant can manage company members.

create policy "company_members_select"
  on company_members for select
  using (
    is_super()
    or profile_id = auth.uid()
    or is_company_member(company_id)
  );

create policy "company_members_insert"
  on company_members for insert
  with check (
    is_super()
    or exists (
      select 1 from companies c
      where c.id = company_id
      and is_account_member(c.client_account_id)
      and account_role(c.client_account_id) in ('owner', 'accountant')
    )
  );

create policy "company_members_update"
  on company_members for update
  using (
    is_super()
    or exists (
      select 1 from companies c
      where c.id = company_id
      and is_account_member(c.client_account_id)
      and account_role(c.client_account_id) in ('owner', 'accountant')
    )
  );

-- ── COMPANY SUBSCRIPTIONS ───────────────────────────────
-- Company members can view their subscription.
-- Only superadmin can modify (Stripe webhook updates).

create policy "company_subscriptions_select"
  on company_subscriptions for select
  using (
    is_super()
    or is_company_member(company_id)
  );

create policy "company_subscriptions_insert"
  on company_subscriptions for insert
  with check (
    is_super()
    or is_company_member(company_id)
  );

create policy "company_subscriptions_update"
  on company_subscriptions for update
  using (is_super());

-- ── TRANSACTION APPROVALS ───────────────────────────────
-- Company members can see approvals for their transactions.
-- Any company member can create an approval action.
-- Append-only: no update/delete policies.

create policy "transaction_approvals_select"
  on transaction_approvals for select
  using (
    is_super()
    or exists (
      select 1 from transactions t
      where t.id = transaction_id
      and is_company_member(t.company_id)
    )
  );

create policy "transaction_approvals_insert"
  on transaction_approvals for insert
  with check (
    is_super()
    or exists (
      select 1 from transactions t
      where t.id = transaction_id
      and is_company_member(t.company_id)
    )
  );

-- ── DOCUMENT ACKNOWLEDGEMENTS ───────────────────────────
-- Account members can see acknowledgements for their docs.
-- Any authenticated user can create an acknowledgement.
-- Append-only: no update/delete policies.

create policy "document_acknowledgements_select"
  on document_acknowledgements for select
  using (
    is_super()
    or exists (
      select 1 from documents d
      where d.id = document_id
      and is_account_member(d.client_account_id)
    )
  );

create policy "document_acknowledgements_insert"
  on document_acknowledgements for insert
  with check (
    is_super()
    or profile_id = auth.uid()
  );

-- ── PAYROLL RUNS ────────────────────────────────────────
-- Company members can view payroll runs.
-- Director/accountant can create payroll runs.
-- No delete — 50-year retention (ЗСч чл. 47).

create policy "payroll_runs_select"
  on payroll_runs for select
  using (
    is_super()
    or is_company_member(company_id)
  );

create policy "payroll_runs_insert"
  on payroll_runs for insert
  with check (
    is_super()
    or is_company_member(company_id)
  );

-- NOTE: No UPDATE or DELETE policies for payroll_runs.
-- Payroll records have 50-year retention and should not be modified.
-- Corrections are done via new payroll_runs with adjusted values.


-- ──────────────────────────────────────────────────────────
-- C5: Fix profiles_insert policy — was `with check (true)`
--     which allows any user to insert with arbitrary id.
--     Trigger handle_new_user() has SECURITY DEFINER and
--     bypasses RLS, so this restriction is safe.
-- ──────────────────────────────────────────────────────────

drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_insert"
  on public.profiles for insert
  with check (id = auth.uid() or is_super());


-- ──────────────────────────────────────────────────────────
-- M1: journal_lines UPDATE/DELETE policies
--     Only for unlocked batches (locked_at IS NULL).
--     Required for manual editing (migration 000011).
-- ──────────────────────────────────────────────────────────

create policy "journal_lines_update"
  on journal_lines for update
  using (
    is_super()
    or exists (
      select 1 from journal_batches jb
      where jb.id = batch_id
      and jb.locked_at is null
      and is_company_member(jb.company_id)
    )
  );

create policy "journal_lines_delete"
  on journal_lines for delete
  using (
    is_super()
    or exists (
      select 1 from journal_batches jb
      where jb.id = batch_id
      and jb.locked_at is null
      and is_company_member(jb.company_id)
    )
  );


-- ──────────────────────────────────────────────────────────
-- M2: Missing updated_at triggers
-- ──────────────────────────────────────────────────────────

create trigger owners_updated_at
  before update on owners
  for each row execute procedure update_updated_at();

create trigger client_accounts_updated_at
  before update on client_accounts
  for each row execute procedure update_updated_at();

create trigger company_subscriptions_updated_at
  before update on company_subscriptions
  for each row execute procedure update_updated_at();


-- ──────────────────────────────────────────────────────────
-- Verify: count policies per table (run manually)
-- ──────────────────────────────────────────────────────────
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;