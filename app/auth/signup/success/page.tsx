import type { Metadata } from 'next'
import Link from 'next/link'
import Stripe from 'stripe'
import AuthNav from '@/app/components/AuthNav'
import OnboardingStepIndicator from '@/app/components/OnboardingStepIndicator'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { reconcilePayment } from '@/lib/reconcile-payment'
import VerifyingPayment, { type PaymentTerminalState } from './VerifyingPayment'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const SUPPORT_EMAIL = 'contact@thenightside.net'


export const metadata: Metadata = {
  title: "Payment received",
}

export default async function SignupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams

  // Confirm payment through the single reconciliation path (sets paid_at + logs
  // payment_completed idempotently). Prefer the authenticated user; if the
  // session cookie is somehow absent, fall back to the user id carried in the
  // Checkout session metadata (platform-set, unforgeable) so a valid return URL
  // still activates the account. `result.ok` is the ground truth for paid_at —
  // we only render "Payment received" when it's actually set.
  let paid = false
  // Thread reconcile's reason (not just .ok) so the timed-out card can be honest:
  // not_found (Stripe says unpaid) / needs_activation (paid, can't auto-finish) /
  // transient (Stripe API threw). Defaults to not_found — incl. the no-userId case,
  // where we can't identify a payment for this visitor at all.
  let terminalState: PaymentTerminalState = 'not_found'
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userId = user?.id ?? null
  if (!userId && sessionId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      userId = session.metadata?.supabase_user_id ?? null
    } catch (err) {
      console.error('Success page session lookup failed:', err)
    }
  }
  if (userId) {
    const result = await reconcilePayment(userId, 'success_page')
    if (result.ok) {
      paid = true
    } else {
      terminalState =
        result.reason === 'ambiguous_manual_review' || result.reason === 'activation_failed' ? 'needs_activation'
        : result.reason === 'stripe_error' ? 'transient'
        : 'not_found' // no_payment | stripe_unpaid | session_not_found
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3e8', display: 'flex', flexDirection: 'column' }}>
      <AuthNav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px 48px', gap: 32 }}>
        <OnboardingStepIndicator currentStep={4} />
        <div style={{
          background: '#ffffff',
          border: '1px solid #e8e4d8',
          borderRadius: '16px',
          maxWidth: '440px',
          width: '100%',
          padding: '48px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          textAlign: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: '20px', width: 'auto', display: 'inline-block', marginBottom: '32px' }} />

          {paid ? (
            <>
              <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
                Payment received
              </h1>
              <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 8px 0' }}>
                Your payment was received and your account is ready.
              </p>
              <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px 0' }}>
                One more step: designate your Legacy Contact. This is the person who can access your planning materials if you pass away.<br />It will take about 3 minutes.
              </p>
              <Link
                href="/app/onboarding/legacy-contact"
                style={{
                  display: 'inline-block',
                  padding: '12px 28px',
                  background: '#2d3a6b',
                  color: '#ffffff',
                  borderRadius: '100px',
                  fontFamily: hv,
                  fontSize: '15px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Designate Legacy Contact →
              </Link>
            </>
          ) : (
            <VerifyingPayment supportEmail={SUPPORT_EMAIL} terminalState={terminalState} />
          )}
        </div>
      </div>
    </div>
  )
}
