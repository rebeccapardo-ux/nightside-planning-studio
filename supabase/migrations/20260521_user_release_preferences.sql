CREATE TABLE IF NOT EXISTS user_release_preferences (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  include_care_wishes    BOOLEAN NOT NULL DEFAULT false,
  include_legacy_map     BOOLEAN NOT NULL DEFAULT false,
  include_values_ranking BOOLEAN NOT NULL DEFAULT false,
  include_fears_ranking  BOOLEAN NOT NULL DEFAULT false,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_release_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own release preferences"
  ON user_release_preferences
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_user_release_preferences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_release_preferences_updated_at
  BEFORE UPDATE ON user_release_preferences
  FOR EACH ROW EXECUTE FUNCTION set_user_release_preferences_updated_at();
