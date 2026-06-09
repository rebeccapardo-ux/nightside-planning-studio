'use client'
import { useState } from 'react'
import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 16px',
  border: '1.5px solid rgba(19,4,38,0.5)', borderRadius: 8, fontSize: 15,
  fontFamily: hv, background: '#ffffff', color: '#1a1a1a', outline: 'none',
}
const btnStyle: React.CSSProperties = {
  width: '100%', padding: 14, background: '#2d3a6b', color: '#fff', border: 'none',
  borderRadius: 100, fontSize: 15, fontWeight: 500, fontFamily: hv, cursor: 'pointer',
}

function Aside({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e8e4d8' }}>
      <h2 style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>{title}</h2>
      <p style={{ fontFamily: hv, fontSize: 13, lineHeight: 1.6, color: '#6b6b6b', margin: 0 }}>{children}</p>
    </div>
  )
}

export default function RecoverAccountPage() {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/recover-account/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong. Please try again.'); setStatus('error'); return }
      setMessage(data.message ?? "If a recovery email is associated with this account, we've sent a link to it.")
      setStatus('sent')
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3e8', display: 'flex', flexDirection: 'column' }}>
      <AuthNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e8e4d8', borderRadius: 16, maxWidth: 460, width: '100%', padding: 48, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: 20, width: 'auto', display: 'inline-block' }} />
          </div>

          {status === 'sent' ? (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>Check your recovery email</h1>
              <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px' }}>{message}</p>
              <Link href="/auth/signin" style={{ fontFamily: hv, fontSize: 14, color: '#2d3a6b', fontWeight: 500, textDecoration: 'none' }}>Back to sign in →</Link>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px', textAlign: 'center' }}>Lost access to your email?</h1>
              <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 12px' }}>
                If you have a verified recovery email set up on your account, we can send you a recovery link there. This works even if you can no longer access your primary email.
              </p>
              <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 24px' }}>
                Enter your primary email below. We&apos;ll send a recovery link to your verified recovery email, if you have one.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <label htmlFor="recover-email" style={{ display: 'block', fontFamily: hv, fontSize: 13, fontWeight: 500, color: '#3a3a3a', marginBottom: 6 }}>Primary email</label>
                <input
                  id="recover-email" type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  style={inputStyle} autoComplete="email"
                />
                {error && <p style={{ fontFamily: hv, fontSize: 12, color: '#c0392b', margin: '6px 0 0' }}>{error}</p>}
                <button type="submit" disabled={status === 'loading'} style={{ ...btnStyle, marginTop: 20, opacity: status === 'loading' ? 0.55 : 1, cursor: status === 'loading' ? 'not-allowed' : 'pointer' }}>
                  {status === 'loading' ? 'Sending…' : 'Send recovery link →'}
                </button>
              </form>

              <Aside title="What if I don't have a recovery email?">
                If you didn&apos;t set up a recovery email in advance, your account can&apos;t be recovered. This is by design — we don&apos;t manually verify identity for account recovery. To prevent this in the future, set up a recovery email from your account settings while you&apos;re signed in.
              </Aside>
              <Aside title="What happens after I click the recovery link?">
                You&apos;ll set a new password and be signed in. All other sessions will be signed out for security.
              </Aside>

              <p style={{ fontFamily: hv, fontSize: 14, color: '#3a3a3a', textAlign: 'center', marginTop: 24, marginBottom: 0 }}>
                <Link href="/auth/signin" style={{ color: '#2d3a6b', fontWeight: 500, textDecoration: 'none' }}>Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
