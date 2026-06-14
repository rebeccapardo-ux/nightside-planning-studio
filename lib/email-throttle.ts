import type { SupabaseClient } from '@supabase/supabase-js'

// Per-user email-relay throttle. The LC-manage and recovery-email routes send
// Nightside-branded mail to USER-SUPPLIED addresses; without a cap, a malicious user
// with their own valid credentials could loop them to relay mail to arbitrary third
// parties via Resend (the password step-up gate doesn't help — it's their password).
// This bounds the number of such operations per user per rolling hour / day.
//
// Ledger: public.email_send_attempts (service-role only; see the 20260610 migration).
// Recorded only on ALLOW — a blocked attempt sends no email, so it shouldn't count
// against the "emails dispatched" budget, and a legit user who hits the cap isn't
// pushed deeper by their own retries. (This is the deliberate divergence from
// recovery_request_attempts, which logs every attempt to harden a pre-auth flow.)

// The 9 throttled operations. Controlled vocab enforced here in code (the DB column
// is free TEXT) — append new values, never rename (they're persisted for forensics).
export type EmailSendOperation =
  | 'lc_edit_email_change'   // edit, only when the LC email actually changes
  | 'lc_replace_primary'     // replace primary with a new person
  | 'lc_promote_secondary'   // replace primary by promoting the secondary
  | 'lc_replace_secondary'   // replace the secondary with a new person
  | 'lc_add_secondary'
  | 'lc_remove_secondary'
  | 'recovery_email_add'
  | 'recovery_email_resend'
  | 'account_email_change'   // direct (admin-path) primary-email change; notifies old + new

// Combined caps across ALL operation types (summed), per the Phase 2 decision.
const HOURLY_LIMIT = 5
const DAILY_LIMIT  = 20

// Non-revealing 429 copy — does not disclose the limit.
export const EMAIL_THROTTLE_MESSAGE =
  "You've performed this operation too many times recently. Please try again later."

// Check the per-user send budget BEFORE any email send (and before the route's DB
// mutation). Counts the user's send-ops in the hour + day windows; if either cap is
// reached, returns { allowed: false } and records nothing. On allow, records this op
// (one row, regardless of how many emails the op dispatches) and returns allowed.
//
// Pass the service-role client the route already holds. Fails OPEN on a DB read error
// (count ?? 0) — consistent with recovery_request_attempts; a transient DB hiccup
// shouldn't block a legitimate operation.
export async function checkAndRecordEmailSend(
  admin: SupabaseClient,
  userId: string,
  operation: EmailSendOperation,
): Promise<{ allowed: boolean }> {
  const now = Date.now()
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString()
  const dayAgo  = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  const [hour, day] = await Promise.all([
    admin.from('email_send_attempts').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gt('created_at', hourAgo),
    admin.from('email_send_attempts').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gt('created_at', dayAgo),
  ])

  if ((hour.count ?? 0) >= HOURLY_LIMIT || (day.count ?? 0) >= DAILY_LIMIT) {
    return { allowed: false }
  }

  // Record this allowed op (rolling window). A failed insert just under-counts —
  // fail-open, conservative toward the legitimate user.
  await admin.from('email_send_attempts').insert({ user_id: userId, operation_type: operation })
  return { allowed: true }
}
