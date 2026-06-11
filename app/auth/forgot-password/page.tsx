'use client'
import { useState } from 'react'
import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

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

            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
                  Check your email
                </h1>
                <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px 0' }}>
                  If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
                </p>
                <Link href="/auth/signin" className="auth-footer-link" style={{ fontSize: '14px' }}>
                  Back to sign in →
                </Link>
              </div>
            ) : (
              <>
                <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px 0', textAlign: 'center' }}>
                  Reset your password
                </h1>
                <p style={{ fontFamily: hv, fontSize: '14px', color: '#3a3a3a', textAlign: 'center', margin: '0 0 32px 0', lineHeight: 1.5 }}>
                  We&apos;ll send a reset link to your email address.
                </p>

                <form onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="forgot-email" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                      Email
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                      autoComplete="email"
                      required
                    />
                  </div>

                  {error && (
                    <p style={{ fontFamily: hv, fontSize: '13px', color: '#8B0000', margin: '12px 0 0 0', lineHeight: 1.4 }}>
                      {error}
                    </p>
                  )}

                  <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: '28px' }}>
                    {loading ? 'Sending…' : 'Send reset link →'}
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
