-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Seed Super Accounts
-- Migration: 20260411000004_seed_super_accounts
-- ═══════════════════════════════════════════════════════════
-- NOTE: This only sets roles for accounts that already exist
-- in auth.users. You must create the users via Supabase
-- Dashboard (Auth → Users → Invite user) FIRST, then
-- run this migration or the upsert below.
-- ═══════════════════════════════════════════════════════════

-- After creating users in Supabase Auth Dashboard,
-- run this to set their roles:

-- SUPERUSER: vkdevproai@gmail.com
-- Full access to everything without paywall
-- Cannot access other users' data
update profiles
set role = 'superuser'
where id = (
  select id from auth.users
  where email = 'vkdevproai@gmail.com'
);

-- SUPERADMIN: vkpro72ai@gmail.com
-- Full access to ALL users' data
-- Can use AI to fix user data issues
-- Can see all audit_events and system_logs
update profiles
set role = 'superadmin'
where id = (
  select id from auth.users
  where email = 'vkpro72ai@gmail.com'
);

-- Verify
select
  u.email,
  p.role,
  p.created_at
from auth.users u
join profiles p on p.id = u.id
where u.email in (
  'vkdevproai@gmail.com',
  'vkpro72ai@gmail.com'
);
