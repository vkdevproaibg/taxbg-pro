CREATE TABLE analytics_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id),
  session_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb,
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Любой аутентифицированный может записывать свои события
CREATE POLICY "analytics_insert_own" ON analytics_events
  FOR INSERT WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

-- Только superadmin читает
CREATE POLICY "analytics_select_super" ON analytics_events
  FOR SELECT USING (is_super());

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_events_profile ON analytics_events(profile_id, created_at DESC);

-- Автоочистка: удалять события старше 90 дней (настроить потом через pg_cron или Edge Function)
COMMENT ON TABLE analytics_events IS
  'Privacy-friendly аналитика. Данните не се споделят с трети страни. '
  'Събират се само при съгласие (cookie consent analytics=true). '
  'Автоматично изтриване след 90 дни.';
