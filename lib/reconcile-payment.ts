import Stripe from 'stripe'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/analytics'

// ---------------------------------------------------------------------------
// Stripe payment reconciliation (recovery)
//
// Resolves the "paid in Stripe but user_profiles.paid_at is null" edge case by
// asking Stripe directly, then setting paid_at if a payment is confirmed.
//
// Order of resolution:
//   1. paid_at already set            -> success (idempotent no-op)
//   2. stripe_session_id stored        -> point-lookup that session in Stripe
//   3. no session id stored            -> fall back to scanning recent sessions,
//      keyed on metadata.supabase_user_id (the authoritative tie to this user)
//
// Cheap to call: only meaningful work happens when paid_at is null, which is the
// rare case. Once it sets paid_at, the caller is in the fast path forever.
// ---------------------------------------------------------------------------

export type ReconcileFailReason =
  | 'no_payment'              // genuinely hasn't paid (no session id, no Stripe match)
  | 'stripe_unpaid'          // session found but payment_status !== 'paid'
  | 'session_not_found'      // stored session id doesn't resolve in Stripe
  | 'ambiguous_manual_review' // paid session(s) for the email but none tie to this user
  | 'activation_failed'      // payment confirmed but the paid_at write didn't stick
  | 'stripe_error'           // Stripe API threw

export type ReconcileResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; reason: ReconcileFailReason; detail?: string }

function stripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Idempotently set paid_at (and backfill the session id so future reconciles are
// point lookups). Logs payment_completed only if THIS call was the setter.
// Returns whether paid_at is actually set afterward — the caller relies on this
// to avoid a redirect loop if the write silently fails.
async function markPaid(admin: SupabaseClient, userId: string, sessionId: string): Promise<boolean> {
  const { data: updated, error } = await admin
    .from('user_profiles')
    .update({ paid_at: new Date().toISOString(), stripe_session_id: sessionId })
    .eq('user_id', userId)
    .is('paid_at', null) // idempotent — don't overwrite if a concurrent path already set it
    .select('paid_at')
    .maybeSingle()

  if (updated) {
    await logEvent({
      userId,
      eventName: 'payment_completed',
      metadata: { stripe_session_id: sessionId, via: 'reconcile' },
      includePlanningStatus: true,
    })
    return true
  }

  if (error) console.error('reconcile markPaid update failed for', userId, error.message)
  // Either a concurrent path already set it, or our write failed — confirm the
  // actual state so the caller doesn't report success on an unset paid_at.
  const { data: row } = await admin
    .from('user_profiles')
    .select('paid_at')
    .eq('user_id', userId)
    .maybeSingle()
  return !!row?.paid_at
}

export async function reconcilePayment(userId: string): Promise<ReconcileResult> {
  const admin = adminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('paid_at, stripe_session_id')
    .eq('user_id', userId)
    .maybeSingle()

  // 1. Already paid — idempotent no-op.
  if (profile?.paid_at) return { ok: true, alreadyPaid: true }

  const stripe = stripeClient()

  try {
    // 2. Stored session id — point lookup.
    if (profile?.stripe_session_id) {
      const session = await stripe.checkout.sessions
        .retrieve(profile.stripe_session_id)
        .catch(() => null)
      if (!session) return { ok: false, reason: 'session_not_found' }
      if (session.payment_status === 'paid' && session.metadata?.supabase_user_id === userId) {
        const set = await markPaid(admin, userId, session.id)
        return set ? { ok: true, alreadyPaid: false } : { ok: false, reason: 'activation_failed' }
      }
      return { ok: false, reason: 'stripe_unpaid' }
    }

    // 3. No session id — scan recent Checkout Sessions. metadata.supabase_user_id
    //    is the authoritative tie to this user (set on every session our flow
    //    creates); customer_email is only used to surface the manual-review case.
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    const email = authUser?.user?.email?.toLowerCase() ?? null

    const cutoff = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90 // last 90 days
    let examined = 0
    let userPaidSession: Stripe.Checkout.Session | null = null
    const paidForEmail: Stripe.Checkout.Session[] = []

    for await (const s of stripe.checkout.sessions.list({ limit: 100, created: { gte: cutoff } })) {
      if (++examined > 1000) break // safety cap; reconciliation is a rare edge case
      if (s.payment_status !== 'paid') continue
      if (s.metadata?.supabase_user_id === userId) { userPaidSession = s; break }
      const sEmail = (s.customer_email ?? s.customer_details?.email ?? '').toLowerCase()
      if (email && sEmail === email) paidForEmail.push(s)
    }

    if (userPaidSession) {
      const set = await markPaid(admin, userId, userPaidSession.id)
      return set ? { ok: true, alreadyPaid: false } : { ok: false, reason: 'activation_failed' }
    }
    if (paidForEmail.length > 0) {
      // Paid session(s) match the email but none carry this user's metadata —
      // can't auto-tie (e.g. a payment made outside our flow). Needs a human.
      return {
        ok: false,
        reason: 'ambiguous_manual_review',
        detail: `${paidForEmail.length} paid session(s) for ${email} without a matching supabase_user_id`,
      }
    }
    return { ok: false, reason: 'no_payment' }
  } catch (err) {
    console.error('reconcilePayment Stripe error for user', userId, err)
    return { ok: false, reason: 'stripe_error', detail: err instanceof Error ? err.message : 'unknown' }
  }
}
