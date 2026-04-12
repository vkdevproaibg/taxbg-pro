-- ─────────────────────────────────────────────────────────
-- PROFILE PURGE FIELDS (GDPR Art. 17 — right to erasure)
-- ─────────────────────────────────────────────────────────
-- Users request account deletion via Settings → "Изтриване на акаунт".
-- A 90-day grace period allows the user to cancel and to download
-- their archive before the actual purge (performed by a separate
-- Edge Function, not included in this migration).
-- ─────────────────────────────────────────────────────────

alter table profiles
  add column if not exists purge_requested_at  timestamptz,
  add column if not exists purge_scheduled_at  timestamptz;

comment on column profiles.purge_requested_at is
  'Timestamp when the user requested account deletion. NULL = no pending request.';

comment on column profiles.purge_scheduled_at is
  'Timestamp when the account will actually be purged (purge_requested_at + 90 days). '
  'An Edge Function scans this column and performs the erasure.';

create index if not exists idx_profiles_purge_scheduled
  on profiles(purge_scheduled_at)
  where purge_scheduled_at is not null;
