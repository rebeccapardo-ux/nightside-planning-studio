import Link from 'next/link'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const primaryBtn: React.CSSProperties = {
  display: 'inline-block', background: '#130426', color: '#F8F4EB',
  border: '1px solid #130426', borderRadius: 22, padding: '12px 28px',
  fontFamily: hv, fontSize: 15, fontWeight: 600, textDecoration: 'none',
}

const secondaryBtn: React.CSSProperties = {
  display: 'inline-block', background: 'transparent', color: '#130426',
  border: '1px solid rgba(19,4,38,0.25)', borderRadius: 22, padding: '12px 28px',
  fontFamily: hv, fontSize: 15, fontWeight: 600, textDecoration: 'none',
}

export default function NotFound() {
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontFamily: apfel, fontSize: 'clamp(32px, 7vw, 44px)', fontWeight: 600, color: '#130426', lineHeight: 1.1, margin: '0 0 16px' }}>
          Page not found
        </h1>
        <p style={{ fontFamily: hv, fontSize: 16, color: 'rgba(19,4,38,0.65)', lineHeight: 1.7, margin: '0 auto 36px', maxWidth: 420 }}>
          This page doesn&apos;t exist. You can head back to Home, or go to the public home page.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/app" style={primaryBtn}>Go to Home</Link>
          <Link href="/" style={secondaryBtn}>Go home</Link>
        </div>
      </div>
    </div>
  )
}
