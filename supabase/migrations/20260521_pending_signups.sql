-- Temporary holding table for signups awaiting Stripe payment confirmation.
-- Records are created when the Checkout Session is opened and deleted by the
-- webhook once payment succeeds and the Supabase account is fully activated.
-- All access is service-role only (no RLS policies for non-service clients).

CREATE TABLE IF NOT EXISTS public.pending_signups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE,
  supabase_user_id  UUID NOT NULL,
  email             TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies — only the service role can access this table.

CREATE INDEX IF NOT EXISTS idx_pending_signups_stripe_session_id
  ON public.pending_signups (stripe_session_id);

CREATE INDEX IF NOT EXISTS idx_pending_signups_supabase_user_id
  ON public.pending_signups (supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_pending_signups_expires_at
  ON public.pending_signups (expires_at);
