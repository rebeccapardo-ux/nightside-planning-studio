ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;
