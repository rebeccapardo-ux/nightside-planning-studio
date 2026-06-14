import type { Metadata } from 'next'
import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'
import { peekToken, peekRecoveryAddresses } from '@/lib/recovery-email'
import RecoverConfirmForm from './RecoverConfirmForm'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Recovery confirm landing. The GET only PEEKS the 'recovery' token (no consume —
// prefetch-safe); the actual consume + password set happens on the POST from the
// form. A non-pristine token renders its terminal state directly.

export const metadata: Metadata = {
  title: "Confirm account recovery",
}

export default async function RecoverConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const state = token ? await peekToken(token, 'recovery') : 'invalid'

  const card = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#f7f3e8', display: 'flex', flexDirection: 'column' }}>
      <AuthNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e8e4d8', borderRadius: 16, maxWidth: 440, width: '100%', padding: 48, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: 20, width: 'auto', display: 'inline-block' }} />
          </div>
          {children}
        </div>
      </div>
    </div>
  )

  // Pristine token → resolve the two (masked) addresses so the form can offer the
  // "which email going forward?" choice. If they can't resolve (e.g. consumed in a
  // race between peek and this lookup), fall through to the terminal state.
  if (state === 'pristine' && token) {
    const addresses = await peekRecoveryAddresses(token)
    if (addresses) {
      return card(
        <RecoverConfirmForm
          token={token}
          primaryMasked={addresses.primaryMasked}
          recoveryMasked={addresses.recoveryMasked}
        />
      )
    }
  }

  const heading =
    state === 'used'    ? 'This recovery link has already been used'
    : state === 'expired' ? 'This recovery link has expired'
    :                     'Invalid recovery link'

  return card(
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>{heading}</h1>
      <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px' }}>
        Recovery links expire after 60 minutes and can only be used once. You can request a new one from the sign-in page.
      </p>
      <Link href="/auth/recover-account" style={{ fontFamily: hv, fontSize: 14, color: '#2d3a6b', fontWeight: 500, textDecoration: 'none' }}>
        Request a new recovery link →
      </Link>
    </div>
  )
}
