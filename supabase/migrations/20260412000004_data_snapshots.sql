-- Data snapshots for backup/restore safety net
CREATE TABLE data_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  client_account_id uuid REFERENCES client_accounts(id),
  company_id uuid REFERENCES companies(id),
  trigger_type text NOT NULL CHECK (trigger_type IN ('daily_auto', 'pre_fix', 'manual', 'pre_purge')),
  snapshot_data jsonb NOT NULL,
  size_bytes integer,
  is_valid boolean NOT NULL DEFAULT true,
  superseded_by uuid REFERENCES data_snapshots(id),
  restored_at timestamptz,
  restored_by uuid REFERENCES profiles(id),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_snapshots_select" ON data_snapshots FOR SELECT USING (is_super() OR profile_id = auth.uid());
CREATE POLICY "data_snapshots_insert" ON data_snapshots FOR INSERT WITH CHECK (is_super() OR profile_id = auth.uid());
CREATE POLICY "data_snapshots_update" ON data_snapshots FOR UPDATE USING (is_super());
CREATE INDEX idx_data_snapshots_profile ON data_snapshots(profile_id, created_at DESC);
CREATE INDEX idx_data_snapshots_company ON data_snapshots(company_id, created_at DESC);
CREATE INDEX idx_data_snapshots_expires ON data_snapshots(expires_at) WHERE is_valid = true;
