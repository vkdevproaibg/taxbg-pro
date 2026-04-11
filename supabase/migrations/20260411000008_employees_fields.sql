-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Employees extra fields
-- Migration: 20260411000008_employees_fields
-- ═══════════════════════════════════════════════════════════
-- gross_salary already exists from 000001 (nullable).
-- New columns: egn, start_date.
-- Also: gross_salary → NOT NULL DEFAULT 0.

-- New columns (idempotent)
alter table employees
  add column if not exists egn        text,
  add column if not exists start_date date;

-- gross_salary: backfill NULLs then enforce NOT NULL + default
update employees set gross_salary = 0 where gross_salary is null;
alter table employees
  alter column gross_salary set not null,
  alter column gross_salary set default 0;

comment on column employees.egn is
  'ЕГН — Bulgarian personal identification number. '
  'Sensitive personal data under GDPR/ЗЗЛД. '
  'Protected by RLS — only active account members can read.';

comment on column employees.start_date is
  'Employment start date as shown in the UI (may differ from hired_date). '
  'Used for Образец 1 and payroll calculations.';
