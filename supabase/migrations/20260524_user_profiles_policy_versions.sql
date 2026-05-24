-- Track which version of the Terms of Service and Privacy Policy a user
-- accepted at signup. Values are ISO date strings (e.g. '2026-05-22')
-- sourced from lib/policy-versions.ts on the client and forwarded via
-- raw_user_meta_data.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS terms_version_accepted   TEXT,
  ADD COLUMN IF NOT EXISTS privacy_version_accepted TEXT;

-- Extend handle_new_user_profile to capture the two new fields alongside
-- the existing terms_accepted_at timestamp.
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    terms_accepted_at,
    terms_version_accepted,
    privacy_version_accepted
  )
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'terms_version_accepted',
    NEW.raw_user_meta_data->>'privacy_version_accepted'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
