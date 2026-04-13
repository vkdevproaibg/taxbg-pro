-- Support tickets for diagnostics & user support
CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  client_account_id uuid REFERENCES client_accounts(id),
  company_id uuid REFERENCES companies(id),
  user_description text,
  screenshot_url text,
  diagnostic_json jsonb NOT NULL,
  ai_diagnosis text,
  ai_suggested_fix text,
  ai_auto_fixable boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'ai_analyzed', 'ai_fixed', 'needs_human', 'in_progress', 'resolved', 'closed')),
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT USING (is_super() OR profile_id = auth.uid());
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT WITH CHECK (profile_id = auth.uid() OR is_super());
CREATE POLICY "support_tickets_update" ON support_tickets FOR UPDATE USING (is_super());
CREATE INDEX idx_support_tickets_status ON support_tickets(status, created_at DESC);
CREATE INDEX idx_support_tickets_profile ON support_tickets(profile_id);
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
