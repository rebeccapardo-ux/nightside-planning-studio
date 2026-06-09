import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'
import { confirmRecoveryEmail } from './actions'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Recovery-email verification landing. Initial GET (with ?token=) shows a Confirm
// button — the token is only consumed on the POST (prefetch-safe). After the POST,
// the server action redirects back here with ?status= to render the outcome.
export default async function RecoveryEmailVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>
}) {
  const { token, status } = await searchParams

  const view: 'confirm' | 'verified' | 'stale' | 'expired' =
    status === 'verified' ? 'verified'
    : status === 'stale'  ? 'stale'
    : status              ? 'expired' // any other status value → expired/invalid
    : token               ? 'confirm'
    :                       'expired' // no token, no status

  const heading =
    view === 'verified' ? 'Recovery email verified'
    : view === 'stale'  ? 'Verification link no longer valid'
    : view === 'expired' ? 'Verification link expired'
    :                      'Confirm your recovery email'

  const body =
    view === 'verified'
      ? 'Recovery email verified. You can now use it to recover your account if needed.'
      : view === 'stale'
      ? 'This verification link is no longer valid because the recovery email on your account has been changed. If you’d like to verify your current recovery email, request a new link from your account settings.'
      : view === 'expired'
      ? 'This verification link has expired or has already been used. You can request a new one from your account settings.'
      : 'You’re confirming this email as the recovery address for your Nightside Planning Studio account. If you ever lose access to your primary email, this address will be used to help you regain access.'

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
          <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>{heading}</h1>
          <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 24px' }}>{body}</p>

          {view === 'confirm' && token ? (
            <form action={confirmRecoveryEmail}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                style={{ width: '100%', padding: 14, background: '#2d3a6b', color: '#fff', border: 'none', borderRadius: 100, fontSize: 15, fontWeight: 500, fontFamily: hv, cursor: 'pointer' }}
              >
                Confirm recovery email
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
