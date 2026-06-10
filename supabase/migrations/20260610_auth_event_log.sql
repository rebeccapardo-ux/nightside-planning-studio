-- 20260610_auth_event_log.sql
--
-- Forensic audit log for authentication / account-security operations. SCHEMA ONLY —
-- no logging integrations yet; the table exists so that adding logging to a specific
-- event later is a one-line service-role write, not a schema migration.
--
-- Design (see the audit-logging threat-model work):
--   * Service-role only (RLS enabled, NO policies) — distinct from
--     legacy_contact_audit_log, which is user-readable (it's a user-facing change log).
--   * user_id is ON DELETE SET NULL (NOT cascade): rows are retained for forensic value
--     after a user is deleted, with the user reference anonymized — the platform's
--     deletion stance prevails over post-deletion attribution. (user_id must therefore
--     be nullable.)
--   * ip_address / user_agent stored RAW (not hashed like recovery_request_attempts):
--     forensic investigation needs the actual values. Both are PII — see the
--     post-launch retention-policy review (deferred).
--   * event_type is free TEXT (no CHECK) — the controlled vocab lives in app code
--     (append-never-rename, since values are persisted), like email_send_attempts.
--
-- Initial event_type vocabulary (documented now for consistency; integrated incrementally):
--   password_changed, password_reset_completed,
--   email_change_requested, email_changed (integrate-if/when),
--   recovery_email_added, recovery_email_verified, recovery_email_removed, recovery_email_resent,
--   account_recovery_requested, account_recovery_completed,
--   account_deleted, session_revoked, step_up_failed (operation in metadata),
--   mfa_enabled / mfa_disabled (future TOTP),
--   sign_in_succeeded / sign_in_failed (integrate-if/when — high volume).
--
-- Idempotent / safe to re-run. Run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.auth_event_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable; retained + anonymized on deletion
  event_type  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT,
  user_agent  TEXT,
  metadata    JSONB
);

-- Query patterns: events for a user over time; all events of a type over time;
-- all events in a time window (forensic sweep).
CREATE INDEX IF NOT EXISTS idx_ael_user_created  ON public.auth_event_log (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ael_event_created ON public.auth_event_log (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_ael_created       ON public.auth_event_log (created_at);

ALTER TABLE public.auth_event_log ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: service-role only (anon/authenticated get no access).

-- ─── Comments (purpose + the SET NULL / raw-IP design choices) ───────────────

COMMENT ON TABLE public.auth_event_log IS
  'Forensic audit log for authentication / account-security operations (password change & reset, '
  'primary-email change, recovery-email add/verify/remove, account recovery, account deletion, '
  'session revocation, step-up failures). Service-role only (RLS enabled, no policies) — distinct '
  'from legacy_contact_audit_log, which is user-readable. user_id is ON DELETE SET NULL (not CASCADE): '
  'rows are retained for forensic value after a user is deleted, with the user reference anonymized — '
  'the platform''s deletion stance prevails over post-deletion attribution. ip_address and user_agent '
  'are stored RAW (not hashed like recovery_request_attempts) because investigation needs the actual '
  'values; both are PII subject to a post-launch retention-policy review (purge events older than a '
  'defined window). NEVER store secrets (passwords, tokens, JWTs, raw recovery tokens) in metadata.';

COMMENT ON COLUMN public.auth_event_log.user_id    IS 'Actor; ON DELETE SET NULL to retain the event after account deletion (anonymized).';
COMMENT ON COLUMN public.auth_event_log.event_type IS 'Controlled vocab enforced in app code (free TEXT here; append-never-rename).';
COMMENT ON COLUMN public.auth_event_log.ip_address IS 'Raw request IP (forensic). PII — see table comment.';
COMMENT ON COLUMN public.auth_event_log.user_agent IS 'Raw request User-Agent (forensic). PII — see table comment.';
COMMENT ON COLUMN public.auth_event_log.metadata   IS 'Per-event_type detail. Loosely shaped; minimize PII; never secrets.';

-- ─── Summary ───────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_rows       bigint;
  v_has_table  boolean;
  v_has_idx_uc boolean;
  v_has_idx_ec boolean;
  v_has_idx_c  boolean;
  v_rls        boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auth_event_log'
  ) INTO v_has_table;
  IF NOT v_has_table THEN
    RAISE EXCEPTION 'auth_event_log table missing after migration';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_ael_user_created')  INTO v_has_idx_uc;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_ael_event_created') INTO v_has_idx_ec;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_ael_created')       INTO v_has_idx_c;
  IF NOT (v_has_idx_uc AND v_has_idx_ec AND v_has_idx_c) THEN
    RAISE EXCEPTION 'auth_event_log indexes missing after migration (user_created=%, event_created=%, created=%)',
      v_has_idx_uc, v_has_idx_ec, v_has_idx_c;
  END IF;

  SELECT relrowsecurity INTO v_rls FROM pg_class WHERE oid = 'public.auth_event_log'::regclass;
  IF NOT v_rls THEN
    RAISE EXCEPTION 'RLS not enabled on auth_event_log';
  END IF;

  SELECT count(*) INTO v_rows FROM public.auth_event_log;

  RAISE NOTICE '--- auth_event_log (forensic audit log) ----------------------';
  RAISE NOTICE 'auth_event_log table:             present';
  RAISE NOTICE 'idx_ael_user_created index:       present';
  RAISE NOTICE 'idx_ael_event_created index:      present';
  RAISE NOTICE 'idx_ael_created index:            present';
  RAISE NOTICE 'row-level security:                enabled (no policies — service-role only)';
  RAISE NOTICE 'event rows:                       %  (expected 0 — new table)', v_rows;
  RAISE NOTICE '-------------------------------------------------------------';
END $$;
