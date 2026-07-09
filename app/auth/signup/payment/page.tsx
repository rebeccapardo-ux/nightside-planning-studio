import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AuthNav from '@/app/components/AuthNav'
import PaymentButton from './PaymentButton'
import { logEvent } from '@/lib/analytics'
import OnboardingStepIndicator from '@/app/components/OnboardingStepIndicator'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"


export const metadata: Metadata = {
  title: "Payment",
}

export default async function PaymentPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // If the user has already paid, send them into the platform.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('paid_at, recovery_email, recovery_email_verified')
    .eq('user_id', user.id)
    .single()

  if (profile?.paid_at) {
    redirect('/app/onboarding/legacy-contact')
  }

  // If email is not confirmed, show a "check your email" message instead of payment.
  const emailConfirmed = !!user.email_confirmed_at
  if (emailConfirmed) {
    logEvent({ userId: user.id, eventName: 'payment_page_reached' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3e8', display: 'flex', flexDirection: 'column' }}>
      <AuthNav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px 48px', gap: 32 }}>
        <OnboardingStepIndicator currentStep={emailConfirmed ? 3 : 2} />
        <div style={{
          background: '#ffffff',
          border: '1px solid #e8e4d8',
          borderRadius: '16px',
          maxWidth: '440px',
          width: '100%',
          padding: '48px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: '40px', width: 'auto', display: 'block', margin: '0 auto 32px' }} />

          {!emailConfirmed ? (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
                Check your email
              </h1>
              <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 8px 0' }}>
                We sent a confirmation link to <strong>{user.email}</strong>. Click it to verify your address, then return here to complete your signup.
              </p>
              <p style={{ fontFamily: hv, fontSize: '13px', lineHeight: 1.5, color: '#6b6b6b', margin: 0 }}>
                Don&apos;t see it? Check your spam folder.
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px 0', textAlign: 'center' }}>
                Complete your signup
              </h1>
              <p style={{ fontFamily: hv, fontSize: '14px', color: '#6b6b6b', textAlign: 'center', margin: '0 0 28px 0', lineHeight: 1.5 }}>
                Your email is confirmed. The next step is payment for lifetime access. After that, you&apos;ll designate a Legacy Contact. You&apos;ll need to do this before starting your plan.
              </p>

              {/* Pricing */}
              <div style={{ background: '#f7f3e8', border: '1px solid #e8e4d8', borderRadius: '10px', padding: '20px 24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: hv, fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
                    Nightside Planning Studio
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: hv, fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>
                      $179 CAD
                    </div>
                    <div style={{ fontFamily: hv, fontSize: '12px', color: '#6b6b6b', marginTop: '2px' }}>
                      + applicable HST/GST
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: hv, fontSize: '13px', color: '#6b6b6b', margin: '10px 0 0 0', lineHeight: 1.4 }}>
                  One-time payment · Lifetime access
                </p>
              </div>

              <PaymentButton />

              {profile?.recovery_email && !profile.recovery_email_verified && (
                <p style={{ fontFamily: hv, fontSize: '12px', color: '#6b6b6b', textAlign: 'center', margin: '16px 0 0', lineHeight: 1.5 }}>
                  We&apos;ve also sent a verification link to your recovery email ({profile.recovery_email}) — verify within the next 24 hours, or request a new link anytime from your account settings.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
