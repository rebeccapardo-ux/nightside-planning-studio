'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 16px',
  border: '1.5px solid rgba(19,4,38,0.5)', borderRadius: 8, fontSize: 15,
  fontFamily: hv, background: '#ffffff', color: '#1a1a1a', outline: 'none',
}

type SignInChoice = '' | 'previous' | 'recovery'
type Result = { promoted: boolean; promotionFailed: boolean }

export default function RecoverConfirmForm({
  token,
  primaryMasked,
  recoveryMasked,
}: {
  token: string
  primaryMasked: string
  recoveryMasked: string
}) {
  const router = useRouter()
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [signInChoice, setSignInChoice]       = useState<SignInChoice>('')
  const [status, setStatus]                   = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult]                   = useState<Result | null>(null)
  const [error, setError]                     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 12)         { setError('Use at least 12 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords don’t match.'); return }
    if (signInChoice === '')          { setError('Please choose which email you’ll use to sign in.'); return }

    setStatus('loading')
    try {
      const res = await fetch('/api/recover-account/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, signInEmail: signInChoice }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong. Please try again.'); setStatus('idle'); return }
      setResult({ promoted: !!data.promoted, promotionFailed: !!data.promotionFailed })
      setStatus('done')
      // No-promotion (and the rare promotion-failed fallback) keep the old auto-advance.
      // A successful promotion does NOT auto-redirect — the user needs to read that their
      // sign-in email changed and that they no longer have a recovery email.
      if (!data.promoted) setTimeout(() => router.push('/app'), 2000)
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
      setStatus('idle')
    }
  }

  if (status === 'done' && result) {
    // ── Promotion succeeded ──
    if (result.promoted) {
      return (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>Account recovered</h1>
          <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 14px' }}>
            Your sign-in email is now <strong>{recoveryMasked}</strong> — use it with your new password from now on. Other sessions have been signed out for security.
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px' }}>
            Now that this address is your sign-in email, you don&apos;t have a recovery email anymore. We recommend adding a new one so you can recover access again if you ever need to.
          </p>
          <Link href="/app/account" style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 14, background: '#2d3a6b', color: '#fff', borderRadius: 100, fontSize: 15, fontWeight: 500, fontFamily: hv, textDecoration: 'none' }}>
            Add a recovery email
          </Link>
          <Link href="/app" style={{ display: 'inline-block', marginTop: 16, fontFamily: hv, fontSize: 14, color: '#2d3a6b', fontWeight: 500, textDecoration: 'none' }}>
            Continue to your plan →
          </Link>
        </div>
      )
    }
    // ── Promotion requested but failed (rare) — signed in with the previous email ──
    if (result.promotionFailed) {
      return (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>Account recovered</h1>
          <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px' }}>
            You&apos;re signed in with your previous email (<strong>{primaryMasked}</strong>). We couldn&apos;t change your sign-in email — you can try again from Account settings, or contact us at <a href="mailto:contact@thenightside.net" style={{ color: '#2d3a6b' }}>contact@thenightside.net</a>. Other sessions have been signed out for security.
          </p>
          <Link href="/app" style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 14, background: '#2d3a6b', color: '#fff', borderRadius: 100, fontSize: 15, fontWeight: 500, fontFamily: hv, textDecoration: 'none' }}>
            Continue to your plan →
          </Link>
        </div>
      )
    }
    // ── No promotion — keep signing in with the previous email (auto-advancing) ──
    return (
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>Account recovered</h1>
        <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#3a3a3a', margin: 0 }}>
          You&apos;re signed in, and you&apos;ll keep signing in with your previous email (<strong>{primaryMasked}</strong>) and your new password. Other sessions have been signed out. Taking you to your plan…
        </p>
      </div>
    )
  }

  return (
    <>
      <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px', textAlign: 'center' }}>Recover your account</h1>
      <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.5, color: '#3a3a3a', textAlign: 'center', margin: '0 0 28px' }}>
        Set a new password to regain access to your Nightside Planning Studio account.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="rec-pw" style={{ display: 'block', fontFamily: hv, fontSize: 13, fontWeight: 500, color: '#3a3a3a', marginBottom: 6 }}>New password</label>
        <input id="rec-pw" type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} style={inputStyle} autoComplete="new-password" />
        <p style={{ fontFamily: hv, fontSize: 12, color: '#6b6b6b', margin: '5px 0 0', lineHeight: 1.4 }}>Use at least 12 characters. Long, memorable passphrases work well.</p>

        <div style={{ marginTop: 20 }}>
          <label htmlFor="rec-pw2" style={{ display: 'block', fontFamily: hv, fontSize: 13, fontWeight: 500, color: '#3a3a3a', marginBottom: 6 }}>Confirm new password</label>
          <input id="rec-pw2" type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError('') }} style={inputStyle} autoComplete="new-password" />
        </div>

        {/* Forward-looking sign-in email choice (no default — the user must pick). */}
        <fieldset style={{ marginTop: 28, border: '1px solid #e8e4d8', borderRadius: 10, padding: '16px 18px' }}>
          <legend style={{ fontFamily: hv, fontSize: 13, fontWeight: 500, color: '#3a3a3a', padding: '0 6px' }}>Going forward, which email should you use to sign in?</legend>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: hv, fontSize: 14, color: '#1a1a1a', cursor: 'pointer', marginTop: 6 }}>
            <input type="radio" name="signInChoice" value="previous" checked={signInChoice === 'previous'} onChange={() => { setSignInChoice('previous'); setError('') }} />
            My previous email — <strong style={{ fontWeight: 600 }}>{primaryMasked}</strong>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: hv, fontSize: 14, color: '#1a1a1a', cursor: 'pointer', marginTop: 12 }}>
            <input type="radio" name="signInChoice" value="recovery" checked={signInChoice === 'recovery'} onChange={() => { setSignInChoice('recovery'); setError('') }} />
            This recovery email — <strong style={{ fontWeight: 600 }}>{recoveryMasked}</strong>
          </label>
        </fieldset>

        {error && <p style={{ fontFamily: hv, fontSize: 13, color: '#8B0000', margin: '12px 0 0', lineHeight: 1.4 }}>{error}</p>}

        <button
          type="submit" disabled={status === 'loading'}
          style={{ width: '100%', padding: 14, marginTop: 24, background: '#2d3a6b', color: '#fff', border: 'none', borderRadius: 100, fontSize: 15, fontWeight: 500, fontFamily: hv, cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.55 : 1 }}
        >
          {status === 'loading' ? 'Setting password…' : 'Set new password & sign in →'}
        </button>
      </form>
    </>
  )
}
