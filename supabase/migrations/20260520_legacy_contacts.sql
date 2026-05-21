-- Legacy contacts: designation table + audit log + triggers

DO $$ BEGIN
  CREATE TYPE legacy_contact_type   AS ENUM ('primary', 'secondary');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE legacy_contact_action AS ENUM ('designated', 'updated', 'removed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Main designation table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS legacy_contacts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_type     legacy_contact_type NOT NULL,
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL,
  email            TEXT        NOT NULL,
  relationship     TEXT        NOT NULL,
  personal_message TEXT        CHECK (char_length(personal_message) <= 1500),
  designated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, contact_type)
);

CREATE INDEX IF NOT EXISTS idx_legacy_contacts_user_id ON legacy_contacts (user_id);

ALTER TABLE legacy_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own legacy contacts"
  ON legacy_contacts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own legacy contacts"
  ON legacy_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own legacy contacts"
  ON legacy_contacts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own legacy contacts"
  ON legacy_contacts FOR DELETE USING (auth.uid() = user_id);

-- ─── Audit log ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS legacy_contact_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        legacy_contact_action NOT NULL,
  contact_type  legacy_contact_type   NOT NULL,
  previous_data JSONB,
  new_data      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lc_audit_user_id ON legacy_contact_audit_log (user_id);

ALTER TABLE legacy_contact_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit log; writes happen only via trigger (SECURITY DEFINER)
CREATE POLICY "Users can view their own audit log"
  ON legacy_contact_audit_log FOR SELECT USING (auth.uid() = user_id);

-- ─── updated_at trigger ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_legacy_contact_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legacy_contacts_updated_at ON legacy_contacts;
CREATE TRIGGER trg_legacy_contacts_updated_at
  BEFORE UPDATE ON legacy_contacts
  FOR EACH ROW EXECUTE FUNCTION update_legacy_contact_updated_at();

-- ─── Audit log trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_legacy_contact_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Skip logging when the user no longer exists (i.e., CASCADE deletion from auth.users).
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
      RETURN OLD;
    END IF;
    INSERT INTO public.legacy_contact_audit_log (user_id, action, contact_type, previous_data)
    VALUES (OLD.user_id, 'removed', OLD.contact_type, to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.legacy_contact_audit_log (user_id, action, contact_type, new_data)
    VALUES (NEW.user_id, 'designated', NEW.contact_type, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.legacy_contact_audit_log (user_id, action, contact_type, previous_data, new_data)
    VALUES (NEW.user_id, 'updated', NEW.contact_type, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_legacy_contact_audit ON legacy_contacts;
CREATE TRIGGER trg_legacy_contact_audit
  AFTER INSERT OR UPDATE OR DELETE ON legacy_contacts
  FOR EACH ROW EXECUTE FUNCTION log_legacy_contact_change();
