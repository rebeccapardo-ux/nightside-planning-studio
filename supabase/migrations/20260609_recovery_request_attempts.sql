-- 20260609_recovery_request_attempts.sql
--
-- Recovery email, Phase 4 (lost-email recovery flow). Two service-role-only objects:
--   * recovery_request_attempts — throttle ledger for the recovery-request route
--     (per-email + per-IP rate limiting; stores SHA-256 hashes, never raw PII).
--   * recovery_lookup(email)     — resolve a primary email to its user + recovery
--     state in one indexed query (there is no admin getUserByEmail; auth.users isn't
--     directly queryable from PostgREST). SECURITY DEFINER, service-role execute only.
--
-- Idempotent / safe to re-run. Run in the Supabase SQL editor.

-- ─── Throttle ledger ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recovery_request_attempts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash  TEXT,       -- SHA-256 of the lowercased primary email (no raw PII)
  ip_hash     TEXT,       -- SHA-256 of the request IP
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rra_email_created ON public.recovery_request_attempts (email_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_rra_ip_created    ON public.recovery_request_attempts (ip_hash, created_at);

ALTER TABLE public.recovery_request_attempts ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: service-role only (anon/authenticated get no access).

-- ─── Email → user/recovery-state lookup (SECURITY DEFINER) ─────────────────

CREATE OR REPLACE FUNCTION public.recovery_lookup(p_email text)
RETURNS TABLE (user_id uuid, first_name text, recovery_email text, recovery_email_verified boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id,
         u.raw_user_meta_data->>'first_name',
         p.recovery_email,
         COALESCE(p.recovery_email_verified, false)
  FROM auth.users u
  JOIN public.user_profiles p ON p.user_id = u.id
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;
$$;

-- Only the service-role key may execute it (the recovery-request route). Never the browser.
REVOKE EXECUTE ON FUNCTION public.recovery_lookup(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.recovery_lookup(text) TO service_role;

-- ─── Summary ───────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_attempts bigint;
  v_has_fn   boolean;
BEGIN
  SELECT count(*) INTO v_attempts FROM public.recovery_request_attempts;
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'recovery_lookup' AND pronamespace = 'public'::regnamespace
  ) INTO v_has_fn;

  IF NOT v_has_fn THEN
    RAISE EXCEPTION 'recovery_lookup function missing after migration';
  END IF;

  RAISE NOTICE '--- recovery_request_attempts + recovery_lookup (Phase 4) ----';
  RAISE NOTICE 'recovery_request_attempts table:  present';
  RAISE NOTICE 'recovery_lookup() function:       present';
  RAISE NOTICE 'attempt rows:                     %  (expected 0 — new table)', v_attempts;
  RAISE NOTICE '-------------------------------------------------------------';
END $$;
