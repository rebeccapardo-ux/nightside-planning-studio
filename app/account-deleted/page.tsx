import Link from 'next/link'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function AccountDeletedPage() {
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>

        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EDE9F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#2C3777" strokeWidth="1.5" />
            <path d="M8 12l3 3 5-5" stroke="#2C3777" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 style={{ fontFamily: hv, fontSize: 26, fontWeight: 600, color: '#130426', margin: '0 0 12px' }}>
          Account deleted
        </h1>
        <p style={{ fontFamily: hv, fontSize: 16, color: 'rgba(19,4,38,0.65)', lineHeight: 1.7, margin: '0 0 36px' }}>
          Your account and all associated data have been permanently deleted. Thank you for using the Planning Studio.
        </p>

        <Link
          href="/auth/signin"
          style={{
            display: 'inline-block', background: '#130426', color: '#F8F4EB',
            borderRadius: 22, padding: '12px 28px',
            fontFamily: hv, fontSize: 15, fontWeight: 600, textDecoration: 'none',
          }}
        >
          Back to sign in
        </Link>

      </div>
    </div>
  )
}
