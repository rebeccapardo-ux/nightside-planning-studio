import Link from 'next/link'

export default function AuthNav() {
  return (
    <nav style={{
      background: '#2C3777',
      borderBottom: '1px solid rgba(248,244,235,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16">
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/The-Nightside-Wordmark-White.svg"
              alt="The Nightside"
              className="h-[31px] w-auto"
            />
          </Link>
        </div>
      </div>
    </nav>
  )
}
