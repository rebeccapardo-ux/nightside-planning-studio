-- 20260608_recovery_email.sql
--
-- Recovery email, Phase 1a (schema only).
--
-- Provisions storage for the account recovery-email mechanism:
--   * user_profiles.recovery_email           — the user's backup address (nullable)
--   * user_profiles.recovery_email_verified  — false until the address is confirmed
--   * recovery_email_tokens                  — single-use, time-limited tokens for
--                                              BOTH the verify and the recovery flows
--
-- No behavior change: nothing reads or writes these yet (Phase 2+). This migration
-- only adds storage.
--
-- Notes:
--   * "Must differ from the primary email" is enforced in APPLICATION code, not here:
--     the primary email lives in auth.users, which a CHECK constraint can't reference
--     per-row. The app also stores recovery_email already-lowercased.
--   * recovery_email_tokens is SERVICE-ROLE ONLY: RLS is enabled with NO policies, so
--     the browser (anon/authenticated) gets zero access; only the service-role key
--     (which bypasses RLS) can issue/consume tokens. We store a SHA-256 HASH of each
--     token, never the raw value — a DB read can't yield a usable link.
--
-- Idempotent / safe to re-run. Run in the Supabase SQL editor.

-- ─── user_profiles: recovery-email columns ─────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS recovery_email          text,
  ADD COLUMN IF NOT EXISTS recovery_email_verified boolean NOT NULL DEFAULT false;

-- ─── recovery_email_tokens: single-use, time-limited token ledger ──────────

CREATE TABLE IF NOT EXISTS public.recovery_email_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL,                  -- SHA-256 of the raw token
  email       TEXT        NOT NULL,                  -- destination snapshot at issue time
  purpose     TEXT        NOT NULL CHECK (purpose IN ('verify', 'recovery')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ                            -- NULL until consumed (single-use)
);

-- Consumption looks up by token_hash; unique so a hash maps to exactly one token.
CREATE UNIQUE INDEX IF NOT EXISTS idx_recovery_email_tokens_token_hash
  ON public.recovery_email_tokens (token_hash);

-- Issuing / superseding a user's tokens for a given purpose (e.g. invalidate old
-- 'verify' tokens when the recovery address changes).
CREATE INDEX IF NOT EXISTS idx_recovery_email_tokens_user_purpose
  ON public.recovery_email_tokens (user_id, purpose);

ALTER TABLE public.recovery_email_tokens ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: service-role only (service_role bypasses RLS; anon and
-- authenticated get no access). Do NOT add user-facing policies — tokens must never
-- be readable by the client.

-- ─── Summary (and abort if columns didn't take) ────────────────────────────

DO $$
DECLARE
  v_total         bigint;
  v_with_recovery bigint;
  v_verified      bigint;
  v_tokens        bigint;
  v_has_email     boolean;
  v_has_verified  boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'user_profiles'
                   AND column_name = 'recovery_email')          INTO v_has_email;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'user_profiles'
                   AND column_name = 'recovery_email_verified') INTO v_has_verified;

  -- Abort loudly rather than leave a half-applied state.
  IF NOT (v_has_email AND v_has_verified) THEN
    RAISE EXCEPTION 'recovery-email columns missing after migration (email=%, verified=%)',
      v_has_email, v_has_verified;
  END IF;

  SELECT count(*) INTO v_total         FROM public.user_profiles;
  SELECT count(*) INTO v_with_recovery FROM public.user_profiles WHERE recovery_email IS NOT NULL;
  SELECT count(*) INTO v_verified      FROM public.user_profiles WHERE recovery_email_verified;
  SELECT count(*) INTO v_tokens        FROM public.recovery_email_tokens;

  RAISE NOTICE '--- recovery_email Phase 1a (schema) --------------------------';
  RAISE NOTICE 'user_profiles.recovery_email column:     present';
  RAISE NOTICE 'user_profiles.recovery_email_verified:   present';
  RAISE NOTICE 'recovery_email_tokens table:             present';
  RAISE NOTICE 'total user_profiles rows:                %', v_total;
  RAISE NOTICE 'rows with recovery_email set:            %  (expected 0 — new column)', v_with_recovery;
  RAISE NOTICE 'rows with recovery_email_verified=true:  %  (expected 0 — new column)', v_verified;
  RAISE NOTICE 'recovery_email_tokens rows:              %  (expected 0 — new table)', v_tokens;
  RAISE NOTICE '-------------------------------------------------------------';
END $$;
