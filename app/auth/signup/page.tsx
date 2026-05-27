'use client'
import { useState } from 'react'
import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import OnboardingStepIndicator from '@/app/components/OnboardingStepIndicator'
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/policy-versions'

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

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [province, setProvince] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  function clearFieldError(field: string) {
    if (fieldErrors[field]) setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')

    // Client-side validation
    const errs: Record<string, string> = {}
    if (!firstName.trim()) errs.firstName = 'Please enter your first name.'
    if (!lastName.trim()) errs.lastName = 'Please enter your last name.'
    if (!email.trim()) errs.email = 'Please enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Please enter a valid email address.'
    if (!password) errs.password = 'Please enter a password.'
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters.'
    else if (!/\d/.test(password)) errs.password = 'Password must include at least one number.'
    if (!province) errs.province = 'Please select your province or territory.'
    if (!termsAccepted) errs.terms = 'Please agree to the Terms of Service and Privacy Policy to continue.'
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    setFieldErrors({})
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          province,
          terms_accepted_at: new Date().toISOString(),
          terms_version_accepted: TERMS_VERSION,
          privacy_version_accepted: PRIVACY_VERSION,
        },
      },
    })

    if (error) {
      setPassword('')
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
        setServerError('An account with this email already exists.')
      } else if (error.message.toLowerCase().includes('invalid email')) {
        setServerError('Please enter a valid email address.')
      } else {
        setServerError('Something went wrong. Please try again.')
      }
      setLoading(false)
    } else if (data.session) {
      // Email confirmation is disabled — user is signed in directly.
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'signup_submitted' }),
      }).catch(() => {})
      window.location.href = '/auth/signup/payment'
    } else {
      if (data.user) {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName: 'signup_submitted', metadata: { userId: data.user.id } }),
        }).catch(() => {})
      }
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
        .auth-input.has-error {
          border-color: #c0392b;
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
          color: rgba(26,26,26,0.65);
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
        .pw-toggle:hover {
          color: rgba(26,26,26,0.75);
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f7f3e8', display: 'flex', flexDirection: 'column' }}>
        <AuthNav />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px 48px', gap: 32 }}>
          <OnboardingStepIndicator currentStep={confirmationSent ? 2 : 1} />
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
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '32px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: '20px', width: 'auto', display: 'inline-block' }} />
                </div>
                <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
                  Check your email
                </h1>
                <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 8px 0' }}>
                  We sent a confirmation link to <strong>{email}</strong>. Click it to verify your address, then continue to payment.
                </p>
                <p style={{ fontFamily: hv, fontSize: '13px', lineHeight: 1.5, color: '#6b6b6b', margin: '0 0 24px 0' }}>
                  Don&apos;t see it? Check your spam folder.
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
                <p style={{ fontFamily: hv, fontSize: '14px', color: '#6b6b6b', fontWeight: 400, textAlign: 'center', margin: '0 0 28px 0', lineHeight: 1.5 }}>
                  Tell us a bit about yourself to get started.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate>

                  {/* Name row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label htmlFor="signup-first-name" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                        First name <span style={{ color: '#c0392b' }}>*</span>
                      </label>
                      <input
                        id="signup-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName') }}
                        className={`auth-input${fieldErrors.firstName ? ' has-error' : ''}`}
                        autoComplete="given-name"
                      />
                      {fieldErrors.firstName && <p style={{ fontFamily: hv, fontSize: '12px', color: '#c0392b', margin: '4px 0 0 0' }}>{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <label htmlFor="signup-last-name" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                        Last name <span style={{ color: '#c0392b' }}>*</span>
                      </label>
                      <input
                        id="signup-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName') }}
                        className={`auth-input${fieldErrors.lastName ? ' has-error' : ''}`}
                        autoComplete="family-name"
                      />
                      {fieldErrors.lastName && <p style={{ fontFamily: hv, fontSize: '12px', color: '#c0392b', margin: '4px 0 0 0' }}>{fieldErrors.lastName}</p>}
                    </div>
                  </div>

                  {/* Email */}
                  <div style={{ marginTop: '20px' }}>
                    <label htmlFor="signup-email" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                      Email <span style={{ color: '#c0392b' }}>*</span>
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
                      className={`auth-input${fieldErrors.email ? ' has-error' : ''}`}
                      autoComplete="email"
                    />
                    {fieldErrors.email && <p style={{ fontFamily: hv, fontSize: '12px', color: '#c0392b', margin: '4px 0 0 0' }}>{fieldErrors.email}</p>}
                  </div>

                  {/* Password */}
                  <div style={{ marginTop: '20px' }}>
                    <label htmlFor="signup-password" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                      Password <span style={{ color: '#c0392b' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
                        className={`auth-input${fieldErrors.password ? ' has-error' : ''}`}
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
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                    {fieldErrors.password
                      ? <p style={{ fontFamily: hv, fontSize: '12px', color: '#c0392b', margin: '4px 0 0 0' }}>{fieldErrors.password}</p>
                      : <p style={{ fontFamily: hv, fontSize: '12px', color: '#6b6b6b', margin: '5px 0 0 0', lineHeight: 1.4 }}>Use at least 8 characters, including letters and a number.</p>
                    }
                  </div>

                  {/* Province */}
                  <div style={{ marginTop: '20px' }}>
                    <label htmlFor="signup-province" style={{ display: 'block', fontFamily: hv, fontSize: '13px', fontWeight: 500, color: '#3a3a3a', marginBottom: '6px' }}>
                      Province <span style={{ color: '#c0392b' }}>*</span>
                    </label>
                    <select
                      id="signup-province"
                      value={province}
                      onChange={(e) => { setProvince(e.target.value); clearFieldError('province') }}
                      className={`auth-input auth-select${!province ? ' placeholder-shown' : ''}${fieldErrors.province ? ' has-error' : ''}`}
                      style={{ color: province ? '#1a1a1a' : 'rgba(26,26,26,0.28)' }}
                    >
                      <option value="" disabled>Select your province or territory</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p} style={{ color: '#1a1a1a' }}>{p}</option>
                      ))}
                    </select>
                    {fieldErrors.province && <p style={{ fontFamily: hv, fontSize: '12px', color: '#c0392b', margin: '4px 0 0 0' }}>{fieldErrors.province}</p>}
                  </div>

                  {/* Privacy notice */}
                  <div style={{ marginTop: '20px', background: '#f7f3e8', border: '1px solid #e8e4d8', borderRadius: '8px', padding: '10px 14px' }}>
                    <p style={{ fontFamily: hv, fontSize: '12px', color: '#6b6b6b', margin: 0, lineHeight: 1.5 }}>
                      <strong style={{ color: '#3a3a3a' }}>Your privacy:</strong> Your data is encrypted and accessible only to you. We don&apos;t sell or share your information.
                    </p>
                  </div>

                  {/* Terms consent */}
                  <div style={{ marginTop: '20px' }}>
                    <label htmlFor="signup-terms" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        id="signup-terms"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={e => { setTermsAccepted(e.target.checked); clearFieldError('terms') }}
                        style={{ marginTop: '2px', flexShrink: 0, width: 16, height: 16, accentColor: '#2d3a6b', cursor: 'pointer' }}
                      />
                      <span style={{ fontFamily: hv, fontSize: '13px', color: '#3a3a3a', lineHeight: 1.5 }}>
                        I have read and agree to the{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#2d3a6b', textDecoration: 'underline' }}>Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#2d3a6b', textDecoration: 'underline' }}>Privacy Policy</a>.
                      </span>
                    </label>
                    <p style={{ fontFamily: hv, fontSize: '12px', fontStyle: 'italic', color: 'rgba(19, 4, 38, 0.70)', lineHeight: 1.5, margin: '6px 0 0 26px' }}>
                      Your information is stored in Canada. Some processing occurs through providers in other countries — see our Privacy Policy for details.
                    </p>
                    {fieldErrors.terms && <p style={{ fontFamily: hv, fontSize: '12px', color: '#c0392b', margin: '6px 0 0 26px' }}>{fieldErrors.terms}</p>}
                  </div>

                  {/* Server error */}
                  {serverError && (
                    <p style={{ fontFamily: hv, fontSize: '13px', color: '#c0392b', margin: '12px 0 0 0', lineHeight: 1.4 }}>
                      {serverError}
                    </p>
                  )}

                  {/* Submit */}
                  <button type="submit" className="auth-btn" disabled={loading || !termsAccepted} style={{ marginTop: '20px' }}>
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
