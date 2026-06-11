'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthNav from '@/app/components/AuthNav'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

type Phase = 'verifying' | 'ready' | 'submitting' | 'success' | 'invalid'

function validatePassword(pw: string): string | null {
  if (pw.length < 12) return 'Use at least 12 characters.'
  return null
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('verifying')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [serverError, setServerError] = useState('')

  // ─── Exchange code / detect recovery session on mount ────────────────────────
  useEffect(() => {
    let cancelled = false
    const supabase = createSupabaseBrowserClient()

    async function init() {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const hashHasToken = window.location.hash.includes('access_token=')
      const errParam = url.searchParams.get('error') || url.hash.includes('error=')

      if (errParam) {
        if (!cancelled) setPhase('invalid')
        return
      }

      // Recovery-intent precheck: if the URL has neither a PKCE code nor a
      // hash access token, this isn't a real reset flow. Logged-in users
      // get sent to the proper change-password section of My Account
      // (which requires their current password); logged-out users see the
      // invalid-link state.
      const hasRecoveryIntent = !!code || hashHasToken
      if (!hasRecoveryIntent) {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (session) {
          router.replace('/app/account#account-access')
          return
        }
        if (!cancelled) setPhase('invalid')
        return
      }

      // If a session already exists (Supabase SDK auto-detected #access_token=...
      // in the hash on init, OR a prior partial attempt set one), treat the page
      // as in-recovery and show the form directly.
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (cancelled) return
      if (existingSession) {
        if (code) window.history.replaceState({}, '', '/auth/reset-password')
        setPhase('ready')
        return
      }

      // PKCE flow: ?code=... in URL, no session yet → exchange.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error) {
          // Exchange failed (verifier mismatch, code already consumed, etc.) —
          // but a session may have been set by a parallel attempt. Re-check.
          const { data: { session: postSession } } = await supabase.auth.getSession()
          if (cancelled) return
          if (postSession) {
            window.history.replaceState({}, '', '/auth/reset-password')
            setPhase('ready')
            return
          }
          console.error('[reset-password] exchangeCodeForSession failed:', error)
          setPhase('invalid')
          return
        }
        window.history.replaceState({}, '', '/auth/reset-password')
        setPhase('ready')
        return
      }

      // Hash flow: wait for PASSWORD_RECOVERY event or session set by SDK.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return
        if (event === 'PASSWORD_RECOVERY' || session) {
          setPhase('ready')
          subscription.unsubscribe()
        }
      })

      // Timeout fallback — if no recovery session arrives in 5s, link is bad.
      setTimeout(() => {
        if (cancelled) return
        subscription.unsubscribe()
        setPhase((p) => (p === 'verifying' ? 'invalid' : p))
      }, 5000)
    }

    init()
    return () => { cancelled = true }
  }, [])

  // ─── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError('')
    setServerError('')

    const validationError = validatePassword(password)
    if (validationError) { setFieldError(validationError); return }
    if (password !== confirmPassword) { setFieldError('Passwords don’t match.'); return }

    setPhase('submitting')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('[reset-password] updateUser failed', error)
      setServerError('Could not update password. Try requesting a new reset link.')
      setPhase('ready')
      return
    }

    setPhase('success')
    // Notify primary + verified recovery (best-effort) while the recovery session is
    // still valid — must run BEFORE signOut, which revokes it. Supabase's auto
    // password-changed email is OFF, so this is the only reset notification.
    try {
      await fetch('/api/account/notify-password-reset', { method: 'POST' })
    } catch { /* best-effort */ }
    // Sign out so the user logs in fresh with the new password
    await supabase.auth.signOut()
    setTimeout(() => router.push('/auth/signin?reset=success'), 1500)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .auth-input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          border: 1.5px solid rgba(19,4,38,0.5);
          border-radius: 8px;
          font-size: 15px;
          font-family: ${hv};
          background: #ffffff;
          color: #1a1a1a;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
          -webkit-appearance: none;
        }
        .auth-input:focus {
          border-color: #2d3a6b;
          box-shadow: 0 0 0 3px rgba(45,58,107,0.1);
        }
        .auth-input.has-error { border-color: #8B0000; }
        .auth-btn {
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
        .auth-btn:hover:not(:disabled) { background: #3d4e8f; }
        .auth-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .auth-footer-link { color: #2d3a6b; font-weight: 500; text-decoration: none; }
        .auth-footer-link:hover { text-decoration: underline; }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 2px;
          cursor: pointer;
          color: rgba(26,26,26,0.45);
          display: flex;
          align-items: center;
          line-height: 1;
        }
        .pw-toggle:hover { color: rgba(26,26,26,0.75); }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f7f3e8', display: 'flex', flexDirection: 'column' }}>
        <AuthNav />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e8e4d8',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            padding: '48px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>

            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: '20px', width: 'auto', display: 'inline-block' }} />
            </div>

            {phase === 'verifying' && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: hv, fontSize: '15px', color: '#3a3a3a', margin: 0 }}>
                  Verifying your reset link…
                </p>
              </div>
            )}

            {phase === 'invalid' && (
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
                  Reset link expired
                </h1>
                <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px 0' }}>
                  This password reset link is invalid or has expired. Request a new one and try again.
                </p>
                <Link href="/auth/forgot-password" className="auth-footer-link" style={{ fontSize: '14px' }}>
                  Send a new reset link →
                </Link>
              </div>
            )}

            {phase === 'success' && (
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
                  Password updated
                </h1>
                <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: 0 }}>
                  Redirecting you to sign in…
                </p>
              </div>
            )}

            {(phase === 'ready' || phase === 'submitting') && (
              <>
                <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px 0', textAlign: 'center' }}>
                  Set a new password
                </h1>
                <p style={{ fontFamily: hv, fontSize: '14px', color: '#3a3a3a', textAlign: 'center', margin: '0 0 28px 0', lineHeight: 1.5 }}>
                  Choose a new password for your account.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                  <div>
                    <label htmlFor="reset-password" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                      New password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="reset-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setFieldError('') }}
                        className={`auth-input${fieldError ? ' has-error' : ''}`}
                        style={{ paddingRight: '44px' }}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="pw-toggle"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 3l18 18" strokeLinecap="round" />
                            <path d="M10.7 6.4A10 10 0 0 1 12 6c5 0 9 4 10 6-.5 1-1.7 2.6-3.4 4M6.6 7.6C4 9.4 2.5 11.5 2 12c1 2 5 6 10 6 1.5 0 3-.4 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p style={{ fontFamily: hv, fontSize: '12px', color: '#6b6b6b', margin: '5px 0 0 0', lineHeight: 1.4 }}>
                      Use at least 12 characters. Long, memorable passphrases work well.
                    </p>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <label htmlFor="reset-confirm" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                      Confirm new password
                    </label>
                    <input
                      id="reset-confirm"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setFieldError('') }}
                      className={`auth-input${fieldError ? ' has-error' : ''}`}
                      autoComplete="new-password"
                    />
                  </div>

                  {fieldError && (
                    <p style={{ fontFamily: hv, fontSize: '12px', color: '#8B0000', margin: '8px 0 0 0' }}>{fieldError}</p>
                  )}
                  {serverError && (
                    <p style={{ fontFamily: hv, fontSize: '13px', color: '#8B0000', margin: '12px 0 0 0', lineHeight: 1.4 }}>{serverError}</p>
                  )}

                  <button type="submit" className="auth-btn" disabled={phase === 'submitting'} style={{ marginTop: '24px' }}>
                    {phase === 'submitting' ? 'Updating…' : 'Update password →'}
                  </button>
                </form>

                <p style={{ fontFamily: hv, fontSize: '14px', color: '#3a3a3a', textAlign: 'center', marginTop: '20px', marginBottom: 0 }}>
                  <Link href="/auth/signin" className="auth-footer-link">
                    Back to sign in
                  </Link>
                </p>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
