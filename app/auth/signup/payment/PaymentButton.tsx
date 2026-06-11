'use client'

import { useState } from 'react'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function PaymentButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'payment_started' }),
    }).catch(() => {})
    try {
      const res = await fetch('/api/stripe/create-checkout-session', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      // Already activated (reconciled server-side) — go into the app instead of
      // Stripe. Otherwise json.url is the Stripe Checkout URL.
      window.location.href = json.redirect ?? json.url
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .payment-btn {
          width: 100%;
          padding: 14px;
          background: #2d3a6b;
          color: #ffffff;
          border: none;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 500;
          font-family: ${hv};
          cursor: pointer;
          transition: background 200ms ease;
        }
        .payment-btn:hover:not(:disabled) { background: #3d4e8f; }
        .payment-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>
      {error && (
        <p style={{ fontFamily: hv, fontSize: '13px', color: '#8B0000', margin: '0 0 12px 0', lineHeight: 1.4 }}>
          {error}
        </p>
      )}
      <button className="payment-btn" onClick={handleClick} disabled={loading}>
        {loading ? 'Preparing payment…' : 'Continue to payment →'}
      </button>
    </>
  )
}
