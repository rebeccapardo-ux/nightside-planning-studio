-- Add platform_entered_at to user_profiles for first-entry tracking
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS platform_entered_at TIMESTAMPTZ;

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name       TEXT        NOT NULL,
  event_metadata   JSONB,
  planning_status  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id    ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
