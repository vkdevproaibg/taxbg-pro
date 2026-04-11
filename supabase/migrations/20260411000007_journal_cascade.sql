-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Journal cascade FK + performance index
-- Migration: 20260411000007_journal_cascade
-- ═══════════════════════════════════════════════════════════

-- Ensure journal_lines cascade delete when batch is deleted.
-- The FK was already created with ON DELETE CASCADE in 000001,
-- so we drop and re-add only if the constraint exists without cascade.

alter table journal_lines
  drop constraint if exists journal_lines_batch_id_fkey;

alter table journal_lines
  add constraint journal_lines_batch_id_fkey
  foreign key (batch_id)
  references journal_batches(id)
  on delete cascade;

-- Index for fast lookup of batches by source_id
-- (used by deleteTransactionFromSupabase)
create index if not exists idx_journal_batches_source_id
  on journal_batches(source_id)
  where source_id is not null;
