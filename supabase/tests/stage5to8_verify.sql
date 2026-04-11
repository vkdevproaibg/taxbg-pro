-- ══════════════════════════════════════════════════════════════════
-- TaxBG Pro — Stages 5-8 Automated DB Test
-- company_relations, user_integrations, profiles.completed_lessons
-- Run in: Supabase Dashboard → SQL Editor  (postgres / superuser)
-- Expected: all rows show ✓ PASS
-- ══════════════════════════════════════════════════════════════════

CREATE TEMP TABLE IF NOT EXISTS _t58 (
  n    int PRIMARY KEY,
  sec  text,
  test text,
  ok   boolean,
  note text DEFAULT ''
) ON COMMIT DROP;
DELETE FROM _t58;

DO $$
DECLARE
  v_count   int;
  v_default text;
  v_pct     numeric;

  c_owner   constant uuid := 's8000001-0000-0000-0000-000000000001';
  c_acct    constant uuid := 's8000001-0000-0000-0000-000000000002';
  c_comp1   constant uuid := 's8000001-0000-0000-0000-000000000003';
  c_comp2   constant uuid := 's8000001-0000-0000-0000-000000000004';
  c_rel     constant uuid := 's8000001-0000-0000-0000-000000000005';
BEGIN

  -- ── Pre-cleanup (idempotent) ─────────────────────────────────
  DELETE FROM client_accounts WHERE id = c_acct;
  DELETE FROM owners           WHERE id = c_owner;

  -- ╔══════════════════════════╗
  -- ║  1. Schema               ║
  -- ╚══════════════════════════╝

  -- 1.1 company_relations table
  INSERT INTO _t58 VALUES (1, '1. Schema', 'company_relations table exists',
    EXISTS(SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name   = 'company_relations'), '');

  -- 1.2 company_relations.client_account_id
  INSERT INTO _t58 VALUES (2, '1. Schema', 'company_relations has client_account_id',
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name   = 'company_relations'
             AND column_name  = 'client_account_id'), '');

  -- 1.3 RLS on company_relations
  INSERT INTO _t58 VALUES (3, '1. Schema', 'RLS enabled on company_relations',
    EXISTS(SELECT 1 FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relname = 'company_relations'
             AND c.relrowsecurity = true), '');

  -- 1.4 user_integrations table
  INSERT INTO _t58 VALUES (4, '1. Schema', 'user_integrations table exists',
    EXISTS(SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name   = 'user_integrations'), '');

  -- 1.5 user_integrations encrypted columns (4 of 4)
  SELECT COUNT(*) INTO v_count
  FROM   information_schema.columns
  WHERE  table_schema = 'public' AND table_name = 'user_integrations'
    AND  column_name IN (
           'nap_api_key_enc', 'smtp_password_enc',
           'resend_key_enc',  'pik_code_enc'
         );
  INSERT INTO _t58 VALUES (5, '1. Schema', 'user_integrations has 4 encrypted columns',
    v_count = 4, 'found: ' || v_count || '/4');

  -- 1.6 RLS on user_integrations
  INSERT INTO _t58 VALUES (6, '1. Schema', 'RLS enabled on user_integrations',
    EXISTS(SELECT 1 FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relname = 'user_integrations'
             AND c.relrowsecurity = true), '');

  -- 1.7 profiles.completed_lessons column
  INSERT INTO _t58 VALUES (7, '1. Schema', 'profiles has completed_lessons column',
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name   = 'profiles'
             AND column_name  = 'completed_lessons'), '');

  -- 1.8 completed_lessons default is empty array
  SELECT column_default INTO v_default
  FROM   information_schema.columns
  WHERE  table_schema = 'public' AND table_name = 'profiles'
    AND  column_name  = 'completed_lessons';
  INSERT INTO _t58 VALUES (8, '1. Schema', 'completed_lessons default is []',
    v_default LIKE '''[]''%',
    'default: ' || COALESCE(v_default, 'NULL'));

  -- ╔══════════════════════════╗
  -- ║  2. RLS Policies         ║
  -- ╚══════════════════════════╝

  INSERT INTO _t58 VALUES (9, '2. RLS', 'company_relations SELECT policy exists',
    EXISTS(SELECT 1 FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename  = 'company_relations'
             AND cmd        = 'SELECT'), '');

  INSERT INTO _t58 VALUES (10, '2. RLS', 'company_relations INSERT policy exists',
    EXISTS(SELECT 1 FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename  = 'company_relations'
             AND cmd        = 'INSERT'), '');

  INSERT INTO _t58 VALUES (11, '2. RLS', 'user_integrations SELECT policy exists',
    EXISTS(SELECT 1 FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename  = 'user_integrations'
             AND cmd        = 'SELECT'), '');

  -- ╔══════════════════════════╗
  -- ║  3. Fixtures             ║
  -- ╚══════════════════════════╝

  INSERT INTO owners (id, full_name, email)
  VALUES (c_owner, 'Stage58 Owner', 'stage58@taxbg.internal');

  INSERT INTO client_accounts (id, owner_id)
  VALUES (c_acct, c_owner);

  INSERT INTO companies (id, client_account_id, name, legal_form)
  VALUES (c_comp1, c_acct, 'ParentCo OOD', 'ood'),
         (c_comp2, c_acct, 'ChildCo OOD',  'ood');

  -- ╔══════════════════════════╗
  -- ║  4. Lifecycle            ║
  -- ╚══════════════════════════╝

  -- 4.1 Insert relation
  INSERT INTO company_relations
    (id, client_account_id, from_company_id, to_company_id,
     type, ownership_pct, notes)
  VALUES
    (c_rel, c_acct, c_comp1, c_comp2,
     'parent', 100.00, 'Stage58 test');

  SELECT COUNT(*) INTO v_count
  FROM   company_relations WHERE id = c_rel;
  INSERT INTO _t58 VALUES (12, '4. Lifecycle', 'Company relation inserted',
    v_count = 1, '');

  -- 4.2 ownership_pct stored correctly
  SELECT ownership_pct INTO v_pct
  FROM   company_relations WHERE id = c_rel;
  INSERT INTO _t58 VALUES (13, '4. Lifecycle', 'ownership_pct stored correctly',
    v_pct = 100, 'pct: ' || v_pct);

  -- ╔══════════════════════════╗
  -- ║  5. Constraints          ║
  -- ╚══════════════════════════╝

  -- 5.1 Duplicate (from, to, type) rejected
  BEGIN
    INSERT INTO company_relations
      (client_account_id, from_company_id, to_company_id, type, notes)
    VALUES
      (c_acct, c_comp1, c_comp2, 'parent', 'duplicate attempt');
    INSERT INTO _t58 VALUES (14, '5. Constraints',
      'Duplicate relation rejected', false, 'expected error, got none');
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO _t58 VALUES (14, '5. Constraints',
      'Duplicate relation rejected', true, '');
  END;

  -- ╔══════════════════════════╗
  -- ║  6. Cascade              ║
  -- ╚══════════════════════════╝

  -- 6.1 Delete account → relations cascade
  DELETE FROM client_accounts WHERE id = c_acct;
  SELECT COUNT(*) INTO v_count
  FROM   company_relations WHERE id = c_rel;
  INSERT INTO _t58 VALUES (15, '6. Cascade',
    'Delete account → relations cascade deleted',
    v_count = 0, 'remaining: ' || v_count);

  -- ── Cleanup ─────────────────────────────────────────────────
  DELETE FROM owners WHERE id = c_owner;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO _t58 VALUES (99, '! ERROR', SQLERRM, false, SQLSTATE);
  BEGIN DELETE FROM client_accounts WHERE id = c_acct; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM owners           WHERE id = c_owner; EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

SELECT
  n                                                           AS "#",
  CASE ok WHEN true THEN '✓ PASS' ELSE '✗ FAIL' END         AS result,
  sec                                                         AS section,
  test,
  CASE WHEN note = '' THEN NULL ELSE note END                 AS detail,
  (SELECT count(*) FILTER (WHERE ok)     FROM _t58)::text
    || '/' ||
  (SELECT count(*)                        FROM _t58)::text    AS score
FROM _t58
ORDER BY n;
