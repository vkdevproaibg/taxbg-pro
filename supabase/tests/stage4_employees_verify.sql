-- ══════════════════════════════════════════════════════════════════
-- TaxBG Pro — Stage 4 Automated DB Test
-- Employees schema, CRUD lifecycle, cascade, multi-company isolation
-- Run in: Supabase Dashboard → SQL Editor  (postgres / superuser)
-- Results appear as a TABLE in the Results tab ↓
-- ══════════════════════════════════════════════════════════════════

-- 1. Create temp table for results
CREATE TEMP TABLE IF NOT EXISTS _t4 (
  n    int PRIMARY KEY,
  sec  text,
  test text,
  ok   boolean,
  note text DEFAULT ''
) ON COMMIT DROP;
DELETE FROM _t4;

-- 2. Run all tests
DO $$
DECLARE
  v_count   int;
  v_default text;
  v_egn     text;

  c_owner1  constant uuid := 'e4000001-0000-0000-0000-000000000001';
  c_owner2  constant uuid := 'e4000001-0000-0000-0000-000000000002';
  c_acct1   constant uuid := 'e4000001-0000-0000-0000-000000000003';
  c_acct2   constant uuid := 'e4000001-0000-0000-0000-000000000004';
  c_comp1   constant uuid := 'e4000001-0000-0000-0000-000000000005';
  c_comp2   constant uuid := 'e4000001-0000-0000-0000-000000000006';
  c_emp1    constant uuid := 'e4000001-0000-0000-0000-000000000007';
BEGIN

  -- ── Pre-cleanup (idempotent) ─────────────────────────────────
  DELETE FROM client_accounts WHERE id IN (c_acct1, c_acct2);
  DELETE FROM owners           WHERE id IN (c_owner1, c_owner2);

  -- ╔══════════════════╗
  -- ║  1. Schema       ║
  -- ╚══════════════════╝

  -- 1.1 egn column exists
  INSERT INTO _t4 VALUES (1, '1. Schema', 'employees has egn column',
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'employees'
             AND column_name = 'egn'), '');

  -- 1.2 gross_salary column exists
  INSERT INTO _t4 VALUES (2, '1. Schema', 'employees has gross_salary column',
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'employees'
             AND column_name = 'gross_salary'), '');

  -- 1.3 start_date column exists
  INSERT INTO _t4 VALUES (3, '1. Schema', 'employees has start_date column',
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'employees'
             AND column_name = 'start_date'), '');

  -- 1.4 RLS enabled on employees
  INSERT INTO _t4 VALUES (4, '1. Schema', 'RLS enabled on employees',
    EXISTS(SELECT 1 FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relname = 'employees'
             AND c.relrowsecurity = true), '');

  -- 1.5 gross_salary default is 0
  SELECT column_default INTO v_default
  FROM   information_schema.columns
  WHERE  table_schema = 'public' AND table_name = 'employees'
    AND  column_name  = 'gross_salary';
  INSERT INTO _t4 VALUES (5, '1. Schema', 'gross_salary default is 0',
    v_default = '0', 'default: ' || COALESCE(v_default, 'NULL'));

  -- ╔══════════════════╗
  -- ║  2. Fixtures     ║
  -- ╚══════════════════╝
  INSERT INTO owners (id, full_name, email)
  VALUES (c_owner1, 'Stage4 Owner1', 'stage4_o1@taxbg.internal'),
         (c_owner2, 'Stage4 Owner2', 'stage4_o2@taxbg.internal');

  INSERT INTO client_accounts (id, owner_id)
  VALUES (c_acct1, c_owner1),
         (c_acct2, c_owner2);

  INSERT INTO companies (id, client_account_id, name, legal_form)
  VALUES (c_comp1, c_acct1, 'EmpCo1 OOD', 'ood'),
         (c_comp2, c_acct2, 'EmpCo2 OOD', 'ood');

  -- ╔════════════════════════╗
  -- ║  3. Lifecycle          ║
  -- ╚════════════════════════╝

  -- 3.1 Insert employee
  INSERT INTO employees (id, company_id, full_name, egn, position,
                         gross_salary, start_date, active, employment_type)
  VALUES (c_emp1, c_comp1, 'Иван Петров', '7501011234', 'Управител',
          1200.00, '2026-01-01', true, 'employee');
  SELECT COUNT(*) INTO v_count FROM employees WHERE id = c_emp1;
  INSERT INTO _t4 VALUES (6, '3. Lifecycle', 'Employee inserted', v_count = 1, '');

  -- 3.2 Readable by company
  SELECT COUNT(*) INTO v_count
  FROM   employees WHERE company_id = c_comp1 AND id = c_emp1;
  INSERT INTO _t4 VALUES (7, '3. Lifecycle', 'Employee readable by company',
    v_count = 1, 'count: ' || v_count);

  -- 3.3 EGN stored correctly
  SELECT egn INTO v_egn FROM employees WHERE id = c_emp1;
  INSERT INTO _t4 VALUES (8, '3. Lifecycle', 'EGN stored correctly',
    v_egn = '7501011234', 'egn: ' || COALESCE(v_egn, 'NULL'));

  -- ╔════════════════════════════╗
  -- ║  4. Multi-company isolation ║
  -- ╚════════════════════════════╝

  -- 4.1 Company1 employee NOT visible via Company2 filter
  SELECT COUNT(*) INTO v_count
  FROM   employees WHERE company_id = c_comp2 AND id = c_emp1;
  INSERT INTO _t4 VALUES (9, '4. Isolation',
    'Company1 employee not visible via Company2 query',
    v_count = 0, 'leaked: ' || v_count);

  -- ╔══════════════════╗
  -- ║  5. Cascade      ║
  -- ╚══════════════════╝

  -- 5.1 Delete company → employees cascade deleted
  DELETE FROM companies WHERE id = c_comp1;
  SELECT COUNT(*) INTO v_count FROM employees WHERE company_id = c_comp1;
  INSERT INTO _t4 VALUES (10, '5. Cascade',
    'Delete company → employees cascade deleted',
    v_count = 0, 'remaining: ' || v_count);

  -- ── Cleanup ─────────────────────────────────────────────────
  DELETE FROM client_accounts WHERE id IN (c_acct1, c_acct2);
  DELETE FROM owners           WHERE id IN (c_owner1, c_owner2);

EXCEPTION WHEN OTHERS THEN
  INSERT INTO _t4 VALUES (99, '! ERROR', SQLERRM, false, SQLSTATE);
  BEGIN DELETE FROM client_accounts WHERE id IN (c_acct1, c_acct2); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM owners           WHERE id IN (c_owner1, c_owner2); EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- 3. Show results as a table
SELECT
  n                                                           AS "#",
  CASE ok WHEN true THEN '✓ PASS' ELSE '✗ FAIL' END         AS result,
  sec                                                         AS section,
  test,
  CASE WHEN note = '' THEN NULL ELSE note END                 AS detail,
  (SELECT count(*) FILTER (WHERE ok)     FROM _t4)::text
    || '/' ||
  (SELECT count(*)                        FROM _t4)::text     AS score
FROM _t4
ORDER BY n;