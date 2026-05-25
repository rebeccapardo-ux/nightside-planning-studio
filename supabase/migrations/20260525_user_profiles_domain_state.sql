-- Per-user domain readiness/orientation state, stored as a single JSONB
-- column. Shape:
--   {
--     "<domain_uuid>": {
--       "checkboxes": { "<item_key>": [true, false, true] },
--       "orient":     { "<item_key>": "not_started" | "in_progress" | "complete" }
--     },
--     ...
--   }
--
-- Replaces the previous combination of localStorage (checkbox_*, ready_*,
-- orient_*) and auth.user_metadata (sync_has_will, sync_has_funeral_wishes,
-- etc.), neither of which synced reliably across devices.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS domain_state JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Users own their own row's mutable state. Add an UPDATE policy if one
-- doesn't already exist. (Reads already covered by the existing
-- "Users can read their own profile" policy.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_profiles'
      AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.user_profiles
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
