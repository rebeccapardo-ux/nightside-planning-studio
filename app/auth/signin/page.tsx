'use client'
import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AuthNav from '@/app/components/AuthNav'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Whitelist post-signin redirect targets. The middleware emits ?next=<path>
// when it bounces an unauthenticated user; we only honor it if the path is
// safely local AND inside /app — which is the only place the middleware
// would have redirected from anyway.
function safeNextPath(raw: string | null): string {
  if (!raw) return '/app'
  if (!raw.startsWith('/')) return '/app'
  if (raw.startsWith('//')) return '/app'
  if (raw.includes('..')) return '/app'
  if (raw !== '/app' && !raw.startsWith('/app/')) return '/app'
  return raw
}

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    // The callback sends people here when it couldn't auto-complete confirmation
    // for this browser — which usually means the email IS confirmed (the link was
    // consumed elsewhere), so this is guidance, not an error. The sign-in attempt
    // below resolves the truth either way. (?error=confirmation_failed is the
    // legacy param; map it to the same calm copy.)
    if (searchParams.get('notice') === 'confirm_pending' || searchParams.get('error') === 'confirmation_failed') {
      setNotice("If you've already confirmed your email, please sign in below. Otherwise, check your inbox for your most recent confirmation link.")
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setPassword('')
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setError('Please confirm your email before signing in. Check your inbox for the confirmation link.')
      } else {
        setError('Incorrect email or password.')
      }
      setLoading(false)
    } else {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'sign_in' }),
      }).catch(() => {})
      window.location.href = safeNextPath(searchParams.get('next'))
    }
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e8e4d8',
      borderRadius: '16px',
      maxWidth: '440px',
      width: '100%',
      padding: '48px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    }}>

      {/* Wordmark */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/The-Nightside-Wordmark-Black.svg"
          alt="The Nightside"
          style={{ height: '20px', width: 'auto', display: 'inline-block' }}
        />
      </div>

      {/* Heading */}
      <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 32px 0', textAlign: 'center' }}>
        Sign in
      </h1>

      {/* Form */}
      <form onSubmit={handleSubmit}>

        {/* Notice (informational — e.g. confirmation needs a sign-in to resolve) —
            above the fields so "sign in below" matches its position */}
        {notice && (
          <p style={{ fontFamily: hv, fontSize: '13px', color: '#2d3a6b', margin: '0 0 24px 0', lineHeight: 1.4 }}>
            {notice}
          </p>
        )}

        {/* Email */}
        <div>
          <label htmlFor="signin-email" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            autoComplete="email"
            required
          />
        </div>

        {/* Password */}
        <div style={{ marginTop: '20px' }}>
          <label htmlFor="signin-password" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            autoComplete="current-password"
            required
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: '8px' }}>
            <Link href="/auth/recover-account" className="auth-forgot-link">
              Lost access to your email?
            </Link>
            <Link href="/auth/forgot-password" className="auth-forgot-link">
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontFamily: hv, fontSize: '13px', color: '#8B0000', margin: '12px 0 0 0', lineHeight: 1.4 }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: '28px' }}>
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>

      </form>

      {/* Footer */}
      <p style={{ fontFamily: hv, fontSize: '14px', color: '#3a3a3a', textAlign: 'center', marginTop: '20px', marginBottom: 0 }}>
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="auth-footer-link">
          Create one →
        </Link>
      </p>

    </div>
  )
}

export default function SignInPage() {
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
        .auth-btn {
          width: 100%;
          padding: 14px;
          background: #2C3777;
          color: #ffffff;
          border: none;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 500;
          font-family: ${hv};
          cursor: pointer;
          transition: background 200ms ease;
        }
        .auth-btn:hover:not(:disabled) {
          background: #3d4e8f;
        }
        .auth-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .auth-forgot-link {
          font-family: ${hv};
          font-size: 13px;
          color: #3a3a3a;
          text-decoration: none;
        }
        .auth-forgot-link:hover {
          text-decoration: underline;
        }
        .auth-footer-link {
          color: #2d3a6b;
          font-weight: 500;
          text-decoration: none;
        }
        .auth-footer-link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f7f3e8', display: 'flex', flexDirection: 'column' }}>
        <AuthNav />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <Suspense fallback={<div style={{ maxWidth: '440px', width: '100%' }} />}>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </>
  )
}
