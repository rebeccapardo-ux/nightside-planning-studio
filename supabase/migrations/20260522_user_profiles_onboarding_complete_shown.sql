ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete_shown BOOLEAN NOT NULL DEFAULT FALSE;
