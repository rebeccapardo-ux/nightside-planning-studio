import type { Metadata } from 'next'
import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'
import { peekToken } from '@/lib/recovery-email'
import { confirmRecoveryEmail } from './actions'
import VerifyStepIndicator from './VerifyStepIndicator'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

type View = 'confirm' | 'verified' | 'stale' | 'used' | 'expired'

// Recovery-email verification page.
// - Post-POST: the server action redirects here with ?status= to render the outcome.
// - Initial GET: peek the token state (no consume — prefetch-safe) and render the
//   right page directly. Only a pristine token shows the Confirm landing; a used /
//   expired / invalid token renders its terminal state instead of a misleading
//   "confirm what you already did" prompt.

export const metadata: Metadata = {
  title: "Verify recovery email",
}

export default async function RecoveryEmailVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>
}) {
  const { token, status } = await searchParams

  let view: View
  if (status) {
    view =
      status === 'verified' ? 'verified'
      : status === 'stale'  ? 'stale'
      :                       'expired' // POST catch-all (consume failed / used / invalid)
  } else if (!token) {
    view = 'expired'
  } else {
    const state = await peekToken(token, 'verify')
    view =
      state === 'pristine' ? 'confirm'
      : state === 'used'   ? 'used'
      :                      'expired' // expired or invalid
  }

  const heading: Record<View, string> = {
    confirm:  'Almost done',
    verified: 'Recovery email verified',
    stale:    'Verification link no longer valid',
    used:     'Already verified',
    expired:  'Verification link expired',
  }

  const body: Record<View, string> = {
    confirm:  'Click below to finish verifying this email as your recovery address.',
    verified: 'Recovery email verified. You can now use it to recover your account if needed.',
    stale:    'This verification link is no longer valid because the recovery email on your account has been changed. If you’d like to verify your current recovery email, request a new link from your account settings.',
    used:     'This recovery email is already verified. You can manage your recovery email anytime from your account settings.',
    expired:  'This verification link has expired or has already been used. You can request a new one from your account settings.',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3e8', display: 'flex', flexDirection: 'column' }}>
      <AuthNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px 48px' }}>
        <div style={{
          background: '#ffffff', border: '1px solid #e8e4d8', borderRadius: 16,
          maxWidth: 440, width: '100%', padding: 48, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', textAlign: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: 20, width: 'auto', display: 'inline-block', marginBottom: 32 }} />
          {/* Mid-sequence cue: step 2 of 2 ("Open link" → "Verify"). On the verified
              outcome it plays the onboarding completion flourish, then fades away. */}
          {view === 'confirm' && <VerifyStepIndicator mode="confirm" />}
          {view === 'verified' && <VerifyStepIndicator mode="verified" />}
          <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>{heading[view]}</h1>
          <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 24px' }}>{body[view]}</p>

          {view === 'confirm' && token ? (
            <form action={confirmRecoveryEmail}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                style={{ width: '100%', padding: 14, background: '#2d3a6b', color: '#fff', border: 'none', borderRadius: 100, fontSize: 15, fontWeight: 500, fontFamily: hv, cursor: 'pointer' }}
              >
                Verify recovery email
              </button>
            </form>
          ) : (
            <Link href="/app/account#account-access" style={{ fontFamily: hv, fontSize: 14, color: '#2d3a6b', fontWeight: 500, textDecoration: 'none' }}>
              Go to account settings →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
