'use client'
import { useState } from 'react'
import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Nova Scotia',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Northwest Territories',
  'Nunavut',
  'Yukon',
]

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [province, setProvince] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: province ? { province } : {} },
    })

    if (error) {
      setPassword('')
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
        setError('An account with this email already exists.')
      } else if (error.message.toLowerCase().includes('invalid email')) {
        setError('Please enter a valid email address.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
    } else if (data.session) {
      window.location.href = '/app'
    } else {
      setConfirmationSent(true)
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
          border: 1.5px solid #d8d4c8;
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
        .auth-input::placeholder {
          color: rgba(26,26,26,0.28);
        }
        .auth-select {
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' stroke='%233a3a3a' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 40px;
          cursor: pointer;
        }
        .auth-select.placeholder-shown {
          color: rgba(26,26,26,0.28);
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
        .auth-btn:hover:not(:disabled) {
          background: #3d4e8f;
        }
        .auth-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
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
          <div style={{
            background: '#ffffff',
            border: '1px solid #e8e4d8',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            padding: '48px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>

            {confirmationSent ? (
              /* Email confirmation state */
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '32px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: '20px', width: 'auto', display: 'inline-block' }} />
                </div>
                <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
                  Check your email
                </h1>
                <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 24px 0' }}>
                  We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
                </p>
                <Link href="/auth/signin" className="auth-footer-link" style={{ fontSize: '14px' }}>
                  Back to sign in →
                </Link>
              </div>
            ) : (
              <>
                {/* Wordmark */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: '20px', width: 'auto', display: 'inline-block' }} />
                </div>

                {/* Heading */}
                <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px 0', textAlign: 'center' }}>
                  Create your account
                </h1>
                <p style={{ fontFamily: hv, fontSize: '14px', color: '#3a3a3a', textAlign: 'center', margin: '0 0 32px 0', lineHeight: 1.5 }}>
                  Free to start. Private by default.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit}>

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                      Email
                    </label>
                    <input
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
                    <label style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>

                  {/* Province */}
                  <div style={{ marginTop: '20px' }}>
                    <label style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                      Province <span style={{ fontWeight: 400, color: 'rgba(58,58,58,0.6)' }}>(optional)</span>
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className={`auth-input auth-select${!province ? ' placeholder-shown' : ''}`}
                      style={{ color: province ? '#1a1a1a' : 'rgba(26,26,26,0.28)' }}
                    >
                      <option value="" disabled>Select your province or territory</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p} style={{ color: '#1a1a1a' }}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Error */}
                  {error && (
                    <p style={{ fontFamily: hv, fontSize: '13px', color: '#c0392b', margin: '12px 0 0 0', lineHeight: 1.4 }}>
                      {error}
                    </p>
                  )}

                  {/* Submit */}
                  <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: '28px' }}>
                    {loading ? 'Creating account…' : 'Create account →'}
                  </button>

                </form>

                {/* Footer */}
                <p style={{ fontFamily: hv, fontSize: '14px', color: '#3a3a3a', textAlign: 'center', marginTop: '20px', marginBottom: 0 }}>
                  Already have an account?{' '}
                  <Link href="/auth/signin" className="auth-footer-link">
                    Sign in →
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
