-- ══════════════════════════════════════════════════════════════════
-- TaxBG Pro — Stage 3 Automated DB Test
-- Run in: Supabase Dashboard → SQL Editor  (postgres / superuser)
-- Results appear as a TABLE in the Results tab ↓
-- ══════════════════════════════════════════════════════════════════

-- 1. Create temp table for results
CREATE TEMP TABLE IF NOT EXISTS _t3 (
  n    int PRIMARY KEY,
  sec  text,
  test text,
  ok   boolean,
  note text DEFAULT ''
) ON COMMIT DROP;
DELETE FROM _t3;

-- 2. Run all tests
DO $$
DECLARE
  v_count  int;
  v_rule   text;
  v_debit  numeric;
  v_credit numeric;
  v_tx2    uuid;

  c_owner   constant uuid := 'f0000001-0000-0000-0000-000000000001';
  c_account constant uuid := 'f0000001-0000-0000-0000-000000000002';
  c_company constant uuid := 'f0000001-0000-0000-0000-000000000003';
  c_tx      constant uuid := 'f0000001-0000-0000-0000-000000000004';
  c_batch   constant uuid := 'f0000001-0000-0000-0000-000000000005';
  c_vat     constant uuid := 'f0000001-0000-0000-0000-000000000006';
  c_tmp     constant uuid := 'f0000001-0000-0000-0000-000000000007';
  c_comp2   constant uuid := 'f0000001-0000-0000-0000-000000000009';
BEGIN

  -- ── Pre-cleanup (idempotent) ─────────────────────────────────
  DELETE FROM client_accounts WHERE id = c_account;
  DELETE FROM owners           WHERE id = c_owner;

  -- ╔══════════════════════╗
  -- ║  1. Schema           ║
  -- ╚══════════════════════╝

  -- 1.1 journal_lines FK has ON DELETE CASCADE
  SELECT rc.delete_rule INTO v_rule
  FROM   information_schema.referential_constraints rc
  JOIN   information_schema.table_constraints tc
    ON   rc.constraint_name = tc.constraint_name
   AND   tc.table_schema    = 'public'
  WHERE  tc.table_name      = 'journal_lines'
    AND  tc.constraint_type = 'FOREIGN KEY'
    AND  rc.constraint_name LIKE '%batch_id%';
  INSERT INTO _t3 VALUES (1, '1. Schema',
    'journal_lines FK → ON DELETE CASCADE',
    v_rule = 'CASCADE', coalesce(v_rule, 'constraint not found'));

  -- 1.2 Index on journal_batches(source_id)
  INSERT INTO _t3 VALUES (2, '1. Schema',
    'idx_journal_batches_source_id exists',
    EXISTS(SELECT 1 FROM pg_indexes
           WHERE schemaname = 'public'
             AND tablename  = 'journal_batches'
             AND indexname  = 'idx_journal_batches_source_id'), '');

  -- 1.3 transactions columns
  SELECT COUNT(*) INTO v_count
  FROM   information_schema.columns
  WHERE  table_schema = 'public' AND table_name = 'transactions'
    AND  column_name IN (
           'id','company_id','date','type','amount',
           'description','vat_rate','is_deferred','status');
  INSERT INTO _t3 VALUES (3, '1. Schema',
    'transactions has 9 required columns',
    v_count = 9, 'found ' || v_count || '/9');

  -- 1.4 journal_batches.source_id
  INSERT INTO _t3 VALUES (4, '1. Schema',
    'journal_batches.source_id column exists',
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name   = 'journal_batches'
             AND column_name  = 'source_id'), '');

  -- 1.5 RLS on transactions
  INSERT INTO _t3 VALUES (5, '1. Schema',
    'RLS enabled on transactions',
    EXISTS(SELECT 1 FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relname = 'transactions'
             AND c.relrowsecurity = true), '');

  -- 1.6 RLS on journal_batches
  INSERT INTO _t3 VALUES (6, '1. Schema',
    'RLS enabled on journal_batches',
    EXISTS(SELECT 1 FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relname = 'journal_batches'
             AND c.relrowsecurity = true), '');

  -- ╔══════════════════════╗
  -- ║  2. Fixtures         ║
  -- ╚══════════════════════╝
  INSERT INTO owners          (id, full_name, email)
  VALUES (c_owner, 'Stage3 Test', 'stage3@taxbg.internal');

  INSERT INTO client_accounts (id, owner_id)
  VALUES (c_account, c_owner);

  INSERT INTO companies       (id, client_account_id, name, legal_form)
  VALUES (c_company, c_account, 'Stage3 OOD', 'ood');

  -- ╔══════════════════════════════════╗
  -- ║  3. Transaction + Journal        ║
  -- ╚══════════════════════════════════╝

  -- 3.1 Insert transaction
  INSERT INTO transactions (id, company_id, date, type, amount, description, status)
  VALUES (c_tx, c_company, '2026-04-11', 'income', 1000, 'Test приход', 'approved');
  SELECT COUNT(*) INTO v_count FROM transactions WHERE id = c_tx;
  INSERT INTO _t3 VALUES (7, '3. Lifecycle', 'Transaction inserted', v_count = 1, '');

  -- 3.2 Journal batch linked to transaction
  INSERT INTO journal_batches (id, company_id, source_type, source_id, description)
  VALUES (c_batch, c_company, 'transaction', c_tx, 'Дт503/Кт703');

  -- 3.3 Two lines per batch
  INSERT INTO journal_lines (batch_id, account_code, debit, credit)
  VALUES (c_batch, '503', 1000, 0),
         (c_batch, '703', 0, 1000);
  SELECT COUNT(*) INTO v_count FROM journal_lines WHERE batch_id = c_batch;
  INSERT INTO _t3 VALUES (8, '3. Lifecycle',
    '2 journal_lines per batch', v_count = 2, 'got ' || v_count);

  -- 3.4 Double-entry: Σdebit = Σcredit
  SELECT SUM(debit), SUM(credit)
  INTO   v_debit, v_credit
  FROM   journal_lines WHERE batch_id = c_batch;
  INSERT INTO _t3 VALUES (9, '3. Lifecycle',
    'Double-entry: Σdebit = Σcredit',
    v_debit = v_credit, 'Σdebit=' || v_debit || ' Σcredit=' || v_credit);

  -- 3.5 VAT batch = 2nd batch for same transaction
  INSERT INTO journal_batches (id, company_id, source_type, source_id, description)
  VALUES (c_vat, c_company, 'transaction', c_tx, 'ДДС Дт503/Кт451');
  INSERT INTO journal_lines (batch_id, account_code, debit, credit)
  VALUES (c_vat, '503', 200, 0), (c_vat, '451', 0, 200);
  SELECT COUNT(*) INTO v_count FROM journal_batches WHERE source_id = c_tx;
  INSERT INTO _t3 VALUES (10, '3. Lifecycle',
    '2 batches per tx (base + VAT)', v_count = 2, 'got ' || v_count);

  -- ╔══════════════════════╗
  -- ║  4. Cascade delete   ║
  -- ╚══════════════════════╝

  -- 4.1 Delete batch → lines cascade
  DELETE FROM journal_batches WHERE id = c_vat;
  SELECT COUNT(*) INTO v_count FROM journal_lines WHERE batch_id = c_vat;
  INSERT INTO _t3 VALUES (11, '4. Cascade',
    'Delete batch → lines cascade', v_count = 0, 'remaining: ' || v_count);

  -- 4.2 App pattern: delete by source_id
  DELETE FROM journal_batches WHERE source_id = c_tx;
  SELECT COUNT(*) INTO v_count FROM journal_lines WHERE batch_id = c_batch;
  INSERT INTO _t3 VALUES (12, '4. Cascade',
    'Delete by source_id → all lines gone', v_count = 0, 'remaining: ' || v_count);

  -- 4.3 Delete transaction
  DELETE FROM transactions WHERE id = c_tx;
  SELECT COUNT(*) INTO v_count FROM transactions WHERE id = c_tx;
  INSERT INTO _t3 VALUES (13, '4. Cascade',
    'Transaction deleted', v_count = 0, '');

  -- 4.4 Delete company → cascades transactions
  INSERT INTO transactions (id, company_id, date, type, amount, description, status)
  VALUES (gen_random_uuid(), c_company, '2026-04-11', 'expense', 500, 'Cascade test', 'approved');
  DELETE FROM companies WHERE id = c_company;
  SELECT COUNT(*) INTO v_count FROM transactions WHERE company_id = c_company;
  INSERT INTO _t3 VALUES (14, '4. Cascade',
    'Delete company → transactions cascade', v_count = 0, 'remaining: ' || v_count);

  -- ╔══════════════════════════╗
  -- ║  5. Constraints          ║
  -- ╚══════════════════════════╝

  -- Recreate company for constraint tests
  INSERT INTO companies (id, client_account_id, name, legal_form)
  VALUES (c_company, c_account, 'Stage3 OOD', 'ood');
  INSERT INTO journal_batches (id, company_id, source_type, description)
  VALUES (c_tmp, c_company, 'manual', 'Constraint test');

  -- 5.1 debit>0 AND credit>0 → rejected
  BEGIN
    INSERT INTO journal_lines (batch_id, account_code, debit, credit)
    VALUES (c_tmp, '503', 100, 100);
    INSERT INTO _t3 VALUES (15, '5. Constraints',
      'Rejects debit>0 AND credit>0', false, 'expected error, got none');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO _t3 VALUES (15, '5. Constraints',
      'Rejects debit>0 AND credit>0', true, '');
  END;

  -- 5.2 debit=0 AND credit=0 → rejected
  BEGIN
    INSERT INTO journal_lines (batch_id, account_code, debit, credit)
    VALUES (c_tmp, '503', 0, 0);
    INSERT INTO _t3 VALUES (16, '5. Constraints',
      'Rejects debit=0 AND credit=0', false, 'expected error, got none');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO _t3 VALUES (16, '5. Constraints',
      'Rejects debit=0 AND credit=0', true, '');
  END;

  -- 5.3 vat_rate=0.15 → rejected
  BEGIN
    INSERT INTO transactions (id, company_id, date, type, amount, description, vat_rate, status)
    VALUES (gen_random_uuid(), c_company, '2026-04-11', 'vat_out', 100, 'Bad VAT', 0.15, 'approved');
    INSERT INTO _t3 VALUES (17, '5. Constraints',
      'Rejects vat_rate=0.15', false, 'expected error, got none');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO _t3 VALUES (17, '5. Constraints',
      'Rejects vat_rate=0.15', true, '');
  END;

  -- 5.4 amount<0 → rejected
  BEGIN
    INSERT INTO transactions (id, company_id, date, type, amount, description, status)
    VALUES (gen_random_uuid(), c_company, '2026-04-11', 'income', -1, 'Negative', 'approved');
    INSERT INTO _t3 VALUES (18, '5. Constraints',
      'Rejects amount < 0', false, 'expected error, got none');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO _t3 VALUES (18, '5. Constraints',
      'Rejects amount < 0', true, '');
  END;

  -- ╔══════════════════════════════╗
  -- ║  6. Multi-company isolation  ║
  -- ╚══════════════════════════════╝
  INSERT INTO companies (id, client_account_id, name, legal_form)
  VALUES (c_comp2, c_account, 'Company 2', 'ood');

  v_tx2 := gen_random_uuid();
  INSERT INTO transactions (id, company_id, date, type, amount, description, status)
  VALUES (v_tx2, c_comp2, '2026-04-11', 'income', 999, 'Comp2 tx', 'approved');

  -- Query by company1 must NOT return company2's transaction
  SELECT COUNT(*) INTO v_count
  FROM   transactions
  WHERE  company_id = c_company AND id = v_tx2;
  INSERT INTO _t3 VALUES (19, '6. Isolation',
    'Company1 query cannot see Company2 tx', v_count = 0, 'leaked rows: ' || v_count);

  DELETE FROM companies WHERE id = c_comp2;

  -- ── Cleanup ─────────────────────────────────────────────────
  DELETE FROM journal_batches WHERE id = c_tmp;
  DELETE FROM client_accounts WHERE id = c_account;  -- cascades everything
  DELETE FROM owners           WHERE id = c_owner;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO _t3 VALUES (99, '! ERROR', SQLERRM, false, SQLSTATE);
  BEGIN DELETE FROM client_accounts WHERE id = c_account; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM owners           WHERE id = c_owner;  EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- 3. Show results as a table
SELECT
  n                                                           AS "#",
  CASE ok WHEN true THEN '✓ PASS' ELSE '✗ FAIL' END         AS result,
  sec                                                         AS section,
  test,
  CASE WHEN note = '' THEN NULL ELSE note END                 AS detail,
  (SELECT count(*) FILTER (WHERE ok)     FROM _t3)::text
    || '/' ||
  (SELECT count(*)                        FROM _t3)::text     AS score
FROM _t3
ORDER BY n;
