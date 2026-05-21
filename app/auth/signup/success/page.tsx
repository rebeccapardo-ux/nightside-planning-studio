import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'
import Stripe from 'stripe'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default async function SignupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
  })

  const { session_id: sessionId } = await searchParams

  // Verify payment with Stripe and mark the account as paid immediately.
  // The webhook also does this, but may lag behind the page redirect.
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.payment_status === 'paid' && session.metadata?.supabase_user_id) {
        await supabaseAdmin
          .from('user_profiles')
          .update({ paid_at: new Date().toISOString() })
          .eq('user_id', session.metadata.supabase_user_id)
          .is('paid_at', null) // idempotent
      }
    } catch (err) {
      console.error('Success page Stripe verification failed:', err)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3e8', display: 'flex', flexDirection: 'column' }}>
      <AuthNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
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

          <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
            Payment received
          </h1>
          <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 8px 0' }}>
            Your payment was received and your account is ready.
          </p>
          <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px 0' }}>
            One more step: designate your Legacy Contact. This is the person who can access your planning materials if you pass away. It will take about 3–5 minutes.
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
        </div>
      </div>
    </div>
  )
}
