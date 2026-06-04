'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Poll cadence: re-run the server-side reconcile a few times, then stop and show
// a bounded fallback. Each refresh costs at most one Stripe lookup, so this is
// capped — a genuinely-unpaid visit can't spin forever.
const MAX_ATTEMPTS = 5
const INTERVAL_MS = 3000

export default function VerifyingPayment({ supportEmail }: { supportEmail: string }) {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) return
    const t = setTimeout(() => {
      setAttempts((a) => a + 1)
      // Re-runs the success page's server component, which re-runs reconcile.
      // The moment paid_at is set, the server swaps in the "Payment received"
      // card and this component unmounts.
      router.refresh()
    }, INTERVAL_MS)
    return () => clearTimeout(t)
  }, [attempts, router])

  const timedOut = attempts >= MAX_ATTEMPTS

  if (timedOut) {
    return (
      <>
        <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
          Still confirming your payment
        </h1>
        <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 8px 0' }}>
          This is taking a little longer than usual. If your payment went through, it will be confirmed automatically within a few minutes — you don&apos;t need to pay again.
        </p>
        <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px 0' }}>
          You can check again, or email{' '}
          <a href={`mailto:${supportEmail}`} style={{ color: '#2d3a6b', textDecoration: 'underline' }}>{supportEmail}</a>{' '}
          and we&apos;ll sort it out right away.
        </p>
        <button
          onClick={() => { setAttempts(0); router.refresh() }}
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#2d3a6b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '100px',
            fontFamily: hv,
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Check again
        </button>
      </>
    )
  }

  return (
    <>
      <style>{`@keyframes ns-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        aria-hidden
        style={{
          width: 32,
          height: 32,
          margin: '0 auto 24px',
          borderRadius: '50%',
          border: '3px solid #e8e4d8',
          borderTopColor: '#2d3a6b',
          animation: 'ns-spin 0.8s linear infinite',
        }}
      />
      <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
        Confirming your payment…
      </h1>
      <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px 0' }}>
        This usually takes just a moment. We&apos;re confirming your payment with our processor — this page will update automatically.
      </p>
    </>
  )
}
