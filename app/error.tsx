'use client'

import { useEffect } from 'react'
import Link from 'next/link'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const primaryBtn: React.CSSProperties = {
  display: 'inline-block', background: '#130426', color: '#F8F4EB',
  border: '1px solid #130426', borderRadius: 22, padding: '12px 28px',
  fontFamily: hv, fontSize: 15, fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  display: 'inline-block', background: 'transparent', color: '#130426',
  border: '1px solid rgba(19,4,38,0.25)', borderRadius: 22, padding: '12px 28px',
  fontFamily: hv, fontSize: 15, fontWeight: 600, textDecoration: 'none',
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontFamily: apfel, fontSize: 'clamp(32px, 7vw, 44px)', fontWeight: 600, color: '#130426', lineHeight: 1.1, margin: '0 0 16px' }}>
          Something went wrong
        </h1>
        <p style={{ fontFamily: hv, fontSize: 16, color: 'rgba(19,4,38,0.65)', lineHeight: 1.7, margin: '0 auto 36px', maxWidth: 420 }}>
          Something didn&apos;t work. You can try again, or head back to your plan.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} style={primaryBtn}>Try again</button>
          <Link href="/app/plan" style={secondaryBtn}>Go to your plan</Link>
        </div>
      </div>
    </div>
  )
}
