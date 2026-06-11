'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 16px',
  border: '1.5px solid rgba(19,4,38,0.5)', borderRadius: 8, fontSize: 15,
  fontFamily: hv, background: '#ffffff', color: '#1a1a1a', outline: 'none',
}

export default function RecoverConfirmForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus]                   = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError]                     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 12)            { setError('Use at least 12 characters.'); return }
    if (password !== confirmPassword)    { setError('Passwords don’t match.'); return }

    setStatus('loading')
    try {
      const res = await fetch('/api/recover-account/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong. Please try again.'); setStatus('idle'); return }
      setStatus('done')
      // Signed in on this device; other sessions revoked. Head into the app.
      setTimeout(() => router.push('/app'), 1200)
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: apfel, fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>Account recovered</h1>
        <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#3a3a3a', margin: 0 }}>
          Your password is set and you&apos;re signed in. Other sessions have been signed out. Taking you to your plan…
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
