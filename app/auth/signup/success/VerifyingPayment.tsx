'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Coarse classification of reconcilePayment's failure reason, threaded from the
// success page so the timed-out card is honest instead of perpetually hedging:
//   not_found        — no_payment | stripe_unpaid | session_not_found (Stripe says unpaid)
//   needs_activation — ambiguous_manual_review | activation_failed (paid, can't auto-finish)
//   transient        — stripe_error (Stripe API threw; worth retrying)
export type PaymentTerminalState = 'not_found' | 'needs_activation' | 'transient'

// Poll cadence: re-run the server-side reconcile a few times, then stop and show
// a bounded terminal state. Each refresh costs at most one Stripe lookup, so this
// is capped — a genuinely-unpaid visit can't spin forever.
const MAX_ATTEMPTS = 5
const INTERVAL_MS = 3000

const h1Style: React.CSSProperties = { fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }
const pStyle: React.CSSProperties = { fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px 0' }
const btnStyle: React.CSSProperties = { display: 'inline-block', padding: '12px 28px', background: '#2d3a6b', color: '#ffffff', border: 'none', borderRadius: '100px', fontFamily: hv, fontSize: '15px', fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }
const linkStyle: React.CSSProperties = { color: '#2d3a6b', textDecoration: 'underline' }

export default function VerifyingPayment({
  supportEmail,
  terminalState,
}: {
  supportEmail: string
  terminalState: PaymentTerminalState
}) {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) return
    const t = setTimeout(() => {
      setAttempts((a) => a + 1)
      // Re-runs the success page's server component, which re-runs reconcile (and
      // re-derives terminalState). The moment paid_at is set, the server swaps in
      // the "Payment received" card and this component unmounts.
      router.refresh()
    }, INTERVAL_MS)
    return () => clearTimeout(t)
  }, [attempts, router])

  const timedOut = attempts >= MAX_ATTEMPTS
  // Reset the poll counter AND re-run reconcile immediately (router.refresh re-runs
  // the server component → reconcilePayment).
  const checkAgain = () => { setAttempts(0); router.refresh() }
  const mail = <a href={`mailto:${supportEmail}`} style={linkStyle}>{supportEmail}</a>

  // ── Still polling: always "Confirming…", regardless of the interim reason, so a
  //    terminal state never flashes while reconcile might still flip to paid. ──
  if (!timedOut) {
    return (
      <>
        <style>{`@keyframes ns-spin { to { transform: rotate(360deg); } }`}</style>
        <div
          aria-hidden
          style={{ width: 32, height: 32, margin: '0 auto 24px', borderRadius: '50%', border: '3px solid #e8e4d8', borderTopColor: '#2d3a6b', animation: 'ns-spin 0.8s linear infinite' }}
        />
        <h1 style={h1Style}>Confirming your payment…</h1>
        <p style={pStyle}>This usually takes just a moment. We&apos;re confirming your payment with our processor — this page will update automatically.</p>
      </>
    )
  }

  // ── Timed out → honest terminal state by reason category ──

  if (terminalState === 'not_found') {
    return (
      <>
        <h1 style={h1Style}>We don&apos;t see a completed payment.</h1>
        <p style={pStyle}>
          We checked with our payment processor and don&apos;t have a completed payment on file for your account. If you just paid, give it a minute and check again. If you haven&apos;t paid yet, you can do that now. Still stuck? Email {mail}.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <button onClick={checkAgain} style={btnStyle}>Check again</button>
          <Link href="/auth/signup/payment" style={linkStyle}>Go to payment →</Link>
        </div>
      </>
    )
  }

  if (terminalState === 'needs_activation') {
    return (
      <>
        <h1 style={h1Style}>We&apos;ve received your payment.</h1>
        <p style={{ ...pStyle, margin: 0 }}>
          Your payment went through, but we need to finish activating your account — no need to pay again. Email {mail} and we&apos;ll get it sorted right away.
        </p>
      </>
    )
  }

  // transient (stripe_error) — keep the existing hedged card + Check again.
  return (
    <>
      <h1 style={h1Style}>Still confirming your payment</h1>
      <p style={{ ...pStyle, margin: '0 0 8px 0' }}>
        This is taking a little longer than usual. If your payment went through, it will be confirmed automatically within a few minutes — you don&apos;t need to pay again.
      </p>
      <p style={pStyle}>
        You can check again, or email {mail} and we&apos;ll sort it out right away.
      </p>
      <button onClick={checkAgain} style={btnStyle}>Check again</button>
    </>
  )
}
