'use client'

import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function SignupSuccessPage() {
  return (
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
          textAlign: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: '20px', width: 'auto', display: 'inline-block', marginBottom: '32px' }} />

          <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
            Payment received
          </h1>
          <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 8px 0' }}>
            Check your email for a confirmation link to activate your account.
          </p>
          <p style={{ fontFamily: hv, fontSize: '13px', lineHeight: 1.5, color: '#6b6b6b', margin: '0 0 28px 0' }}>
            Don&apos;t see it? Check your spam folder. It may take a minute or two to arrive.
          </p>
          <Link
            href="/auth/signin"
            style={{ fontFamily: hv, fontSize: '14px', fontWeight: 500, color: '#2d3a6b', textDecoration: 'none' }}
          >
            Go to sign in →
          </Link>
        </div>
      </div>
    </div>
  )
}
