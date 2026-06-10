-- 20260610_email_send_attempts.sql
--
-- Email-relay throttle ledger. Bounds how many email-sending operations a single
-- authenticated user can trigger per rolling hour / day, across the LC-manage and
-- recovery-email routes. These routes send Nightside-branded email to USER-SUPPLIED
-- addresses (LC designations, recovery-email verifications), so without a per-user
-- cap a malicious user with their own valid credentials could loop them to relay
-- mail to arbitrary third parties via Resend. The password step-up gate doesn't
-- cover this (it's the attacker's own password). See CLAUDE.md rate-limiting notes.
--
-- Keyed on the real user_id (the operation is authenticated; no hashing needed —
-- unlike recovery_request_attempts, which hashes email+IP because that flow is
-- pre-auth and handles possible non-users' PII). operation_type is free TEXT (the
-- 8-value controlled vocab is enforced in app code, EmailSendOperation), matching
-- the codebase's controlled-vocab-as-code philosophy. The throttle counts ALL of a
-- user's rows in the window (summed across operation types).
--
-- Service-role only (RLS enabled, NO policies). FK ON DELETE CASCADE so the rows
-- clean up when the account is deleted (the delete-account route relies on the
-- auth.users cascade for all user-owned tables).
--
-- Idempotent / safe to re-run. Run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.email_send_attempts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT        NOT NULL,   -- one of the 8 EmailSendOperation slugs
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Covers the throttle query: WHERE user_id = $1 AND created_at > <window start>.
CREATE INDEX IF NOT EXISTS idx_esa_user_created ON public.email_send_attempts (user_id, created_at);

ALTER TABLE public.email_send_attempts ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: service-role only (anon/authenticated get no access).

-- ─── Summary ───────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_rows      bigint;
  v_has_table boolean;
  v_has_index boolean;
  v_rls       boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_send_attempts'
  ) INTO v_has_table;
  IF NOT v_has_table THEN
    RAISE EXCEPTION 'email_send_attempts table missing after migration';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_esa_user_created'
  ) INTO v_has_index;
  IF NOT v_has_index THEN
    RAISE EXCEPTION 'idx_esa_user_created index missing after migration';
  END IF;

  SELECT relrowsecurity INTO v_rls
  FROM pg_class WHERE oid = 'public.email_send_attempts'::regclass;
  IF NOT v_rls THEN
    RAISE EXCEPTION 'RLS not enabled on email_send_attempts';
  END IF;

  SELECT count(*) INTO v_rows FROM public.email_send_attempts;

  RAISE NOTICE '--- email_send_attempts (email-relay throttle) ---------------';
  RAISE NOTICE 'email_send_attempts table:        present';
  RAISE NOTICE 'idx_esa_user_created index:       present';
  RAISE NOTICE 'row-level security:                enabled (no policies — service-role only)';
  RAISE NOTICE 'attempt rows:                     %  (expected 0 — new table)', v_rows;
  RAISE NOTICE '-------------------------------------------------------------';
END $$;
