import Link from 'next/link'

export default function LegacyLearnPage() {
  const apfel = "'ApfelGrotezk', sans-serif"
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const inner = { maxWidth: '1280px', marginLeft: 'auto' as const, marginRight: 'auto' as const, paddingLeft: '64px', paddingRight: '64px' }

  return (
    <>
      <style>{`
        .lg-activity-row {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-radius: 12px;
          background: rgba(0,0,0,0.06);
          text-decoration: none;
          transition: background 150ms ease;
        }
        .lg-activity-row:hover {
          background: rgba(0,0,0,0.12);
        }
        .lg-activity-row:hover .lg-arrow {
          transform: translateX(4px);
        }
        .lg-arrow {
          font-size: 18px;
          opacity: 0.6;
          transition: transform 150ms ease;
          flex-shrink: 0;
        }
      `}</style>

      <div>

        {/* ── 1. HERO ── navy */}
        <section style={{ background: '#2C3777' }}>
          <div style={{ ...inner, paddingTop: '80px', paddingBottom: '88px' }}>

            <Link
              href="/app/learn/areas"
              className="hover:opacity-75 transition-opacity"
              style={{ fontFamily: hv, fontSize: '16px', fontWeight: 500, lineHeight: '1.4', color: 'rgba(255,255,255,0.75)', display: 'block', marginBottom: '24px' }}
            >
              ← Areas of planning
            </Link>

            <h1 className="ns-title-activity" style={{ color: '#FFFFFF', margin: '0 0 16px 0' }}>
              Legacy Planning
            </h1>

            <p className="ns-lead-activity" style={{ color: '#FFFFFF', maxWidth: '680px' }}>
              Legacy planning focuses on how you want to be remembered and the impact you leave behind. This can include writing letters or messages for loved ones, creating personal projects, or documenting your life story. It also encompasses decisions about how your values, beliefs, and achievements are celebrated or shared after your death, such as ensuring the correct pronouns are used in your obituary or being remembered in ways that reflect your true self.
            </p>

          </div>
        </section>

        {/* ── 2. EDITORIAL — cream */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '96px', paddingBottom: '96px' }}>
          <div style={inner}>
            <div style={{ maxWidth: '680px' }}>
              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', margin: '0 0 48px 0' }}>
                Reflect on what kind of legacy feels significant to you. This might include writing letters, recording personal stories, or creating a legacy project like a scrapbook, video, or charitable donation. Consider how you want to express your values and identity, including how you wish to be described and remembered in obituaries, memorials, and other public or private settings. Think about what will best preserve your memory for future generations.
              </p>
              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', margin: 0 }}>
                Legacy planning is also an opportunity to connect with family and friends by involving them in creating or sharing these memories together. Ensure your wishes about how your identity and story are represented are clearly communicated to those who will carry them out.
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. NEXT STEPS ── deep purple */}
        <section style={{ width: '100%', background: '#130426', paddingTop: '104px', paddingBottom: '104px' }}>
          <div style={inner}>

            <h2
              style={{ fontFamily: apfel, fontSize: '44px', fontWeight: 600, lineHeight: '1.12', letterSpacing: '-0.01em', color: '#FFFFFF', marginBottom: '20px' }}
            >
              Next steps
            </h2>
            <p
              style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.6', color: 'rgba(255,255,255,0.75)', maxWidth: '620px', marginBottom: '40px' }}
            >
              Use these activities to keep moving.
            </p>

            {/* Activities card — half-width */}
            <div style={{ maxWidth: '560px' }}>
              <div style={{ background: '#F29836', borderRadius: '24px', padding: '36px' }}>
                <h3
                  style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}
                >
                  Relevant Activities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { href: '/app/explore/legacy-map', label: 'Legacy Map' },
                    { href: '/app/capture/advance-directive', label: 'Advance Directive Supplementary Form' },
                  ].map(({ href, label }) => (
                    <Link key={label} href={href} className="lg-activity-row" style={{ display: 'flex', width: '100%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: hv, fontSize: '18px', fontWeight: 500, lineHeight: '1.5', color: '#130426' }}>
                          {label}
                        </span>
                        <span className="lg-arrow" style={{ color: '#130426', fontSize: '18px', opacity: 0.6 }}>→</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </>
  )
}
