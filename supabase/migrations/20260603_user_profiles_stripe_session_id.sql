-- 20260603_user_profiles_stripe_session_id.sql
--
-- Stripe recovery, Phase 1: persist the Checkout session id on the profile so a
-- gated-but-paid user can be reconciled against Stripe (query the session, set
-- paid_at) without relying on the success-page URL param or the webhook.
--
-- Nullable: existing users (and any signup that predates Phase 2) won't have one.
-- Idempotent / safe to re-run. Run in the Supabase SQL editor.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

DO $$
DECLARE
  v_total      bigint;
  v_with_sid   bigint;
  v_paid_nosid bigint;
BEGIN
  SELECT count(*) INTO v_total      FROM public.user_profiles;
  SELECT count(*) INTO v_with_sid   FROM public.user_profiles WHERE stripe_session_id IS NOT NULL;
  -- already-paid rows that have no session id (can't be Stripe-reconciled; informational)
  SELECT count(*) INTO v_paid_nosid FROM public.user_profiles WHERE paid_at IS NOT NULL AND stripe_session_id IS NULL;

  RAISE NOTICE '--- user_profiles.stripe_session_id (Phase 1) ---------------';
  RAISE NOTICE 'total user_profiles rows:               %', v_total;
  RAISE NOTICE 'rows with stripe_session_id set:        %  (expected 0 — new column)', v_with_sid;
  RAISE NOTICE 'paid rows without a session id:         %  (informational — pre-existing paids)', v_paid_nosid;
  RAISE NOTICE '-----------------------------------------------------------';
END $$;
