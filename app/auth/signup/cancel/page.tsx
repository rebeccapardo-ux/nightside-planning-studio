'use client'

import Link from 'next/link'
import AuthNav from '@/app/components/AuthNav'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function SignupCancelPage() {
  return (
    <>
      <style>{`
        .retry-btn {
          display: inline-block;
          padding: 12px 28px;
          background: #2d3a6b;
          color: #ffffff;
          border-radius: 100px;
          font-family: ${hv};
          font-size: 15px;
          font-weight: 500;
          text-decoration: none;
          transition: background 200ms ease;
        }
        .retry-btn:hover { background: #3d4e8f; }
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
            textAlign: 'center',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: '20px', width: 'auto', display: 'inline-block', marginBottom: '32px' }} />

            <h1 style={{ fontFamily: apfel, fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px 0' }}>
              Payment cancelled
            </h1>
            <p style={{ fontFamily: hv, fontSize: '15px', lineHeight: 1.6, color: '#3a3a3a', margin: '0 0 28px 0' }}>
              No charge was made. You can return to the signup form whenever you&apos;re ready.
            </p>
            <Link href="/auth/signup" className="retry-btn">
              Return to signup
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
