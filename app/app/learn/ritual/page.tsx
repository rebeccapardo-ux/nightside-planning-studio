import Link from 'next/link'

export default function RitualLearnPage() {
  const apfel = "'ApfelGrotezk', sans-serif"
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const inner = { maxWidth: '1280px', marginLeft: 'auto' as const, marginRight: 'auto' as const, paddingLeft: '64px', paddingRight: '64px' }

  return (
    <>
      <style>{`
        .rc-activity-row {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-radius: 12px;
          background: rgba(0,0,0,0.06);
          text-decoration: none;
          transition: background 150ms ease;
        }
        .rc-activity-row:hover {
          background: rgba(0,0,0,0.12);
        }
        .rc-activity-row:hover .rc-arrow {
          transform: translateX(4px);
        }
        .rc-arrow {
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
              Ritual &amp; Ceremony
            </h1>

            <div style={{ maxWidth: '680px' }}>
              <p className="ns-lead-activity" style={{ color: '#FFFFFF', margin: '0 0 24px 0' }}>
                Rituals and ceremonies are meaningful ways to honor life, process loss, and create connection. They can take many forms:
              </p>
              <ul style={{ margin: '0 0 24px 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Cultural or religious practices that reflect your heritage.',
                  'Personal rituals, like bedside vigils or small gatherings of loved ones.',
                  'Ceremonies such as funerals, memorials, or celebrations of life.',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '12px', fontFamily: hv, fontSize: '20px', lineHeight: '1.65', fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}>
                    <span style={{ color: '#F29836', flexShrink: 0, marginTop: '2px' }}>·</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p style={{ fontFamily: hv, fontSize: '20px', lineHeight: '1.65', fontWeight: 400, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                As you move through this process, take time to reflect on the rituals and ceremonies that resonate with you. Whether it&apos;s a bedside moment, a memorial gathering, or a quiet act of remembrance, use this process to ensure these meaningful moments align with your values and bring comfort to your loved ones.
              </p>
            </div>

          </div>
        </section>

        {/* ── 2. EDITORIAL ── cream */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '96px', paddingBottom: '96px' }}>
          <div style={inner}>
            <div style={{ maxWidth: '680px' }}>
              <h2
                style={{ fontFamily: apfel, fontSize: '36px', fontWeight: 600, lineHeight: '1.15', letterSpacing: '-0.01em', color: '#1F1A44', marginTop: 0, marginBottom: '28px' }}
              >
                Note: Planning for Marginalized Communities and Culturally Sensitive Deathcare
              </h2>
              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', marginBottom: '32px' }}>
                End-of-life planning is important for everyone, but it&apos;s especially critical for individuals from marginalized communities, who often face compounded barriers to equitable healthcare and deathcare.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                {[
                  {
                    heading: 'Healthcare Discrimination',
                    body: 'LGBTQ+ individuals may face bias in medical settings, making it essential to clearly identify chosen family and decision-makers.',
                  },
                  {
                    heading: 'Cultural Sensitivity in Deathcare',
                    body: 'For Indigenous communities and others with unique cultural or spiritual traditions, end-of-life practices may not always be understood or respected.',
                  },
                  {
                    heading: 'Family Dynamics',
                    body: 'Marginalized individuals may face challenges communicating their wishes, especially when preferences differ from family expectations.',
                  },
                  {
                    heading: 'Knowing Your Rights',
                    body: 'Many people are unaware of legal rights around funerals, body disposition, or ceremonies. Understanding laws—such as those governing home funerals or cremation options—is key to ensuring your wishes are followed.',
                  },
                ].map(({ heading, body }) => (
                  <div key={heading}>
                    <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', margin: 0 }}>
                      <strong style={{ fontWeight: 600 }}>{heading}:</strong>{' '}{body}
                    </p>
                  </div>
                ))}
              </div>

              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', margin: 0 }}>
                This platform supports you in documenting your wishes and provides access to resources that empower you to make informed choices.
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
              Use these activities and resources to keep moving.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>

              {/* Card 1: Relevant Activities — orange */}
              <div style={{ background: '#F29836', borderRadius: '24px', padding: '36px' }}>
                <h3
                  style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}
                >
                  Relevant Activities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { href: '/app/reflect', label: 'Reflection Prompts' },
                    { href: '/app/capture/advance-directive', label: 'Advance Directive Supplementary Form' },
                  ].map(({ href, label }) => (
                    <Link key={label} href={href} className="rc-activity-row" style={{ display: 'flex', width: '100%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: hv, fontSize: '18px', fontWeight: 500, lineHeight: '1.5', color: '#130426' }}>
                          {label}
                        </span>
                        <span className="rc-arrow" style={{ color: '#130426', fontSize: '18px', opacity: 0.6 }}>→</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Card 2: Resources — cream */}
              <div style={{ background: '#F8F4EB', borderRadius: '24px', padding: '36px' }}>
                <h3
                  style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}
                >
                  Explore resources for equitable and culturally-sensitive planning
                </h3>
                <p
                  style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.7', color: '#130426', marginBottom: '28px' }}
                >
                  Without clear plans, wishes related to gender identity, sexuality, cultural practices, or religious traditions may not be honored. It&apos;s important to understand your right and options for funeral practices and body care.
                </p>
                <a
                  href="https://thenightside.net/equitable-deathcare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block hover:opacity-90 transition-opacity"
                  style={{ background: '#DB5835', color: '#FFFFFF', fontFamily: hv, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px' }}
                >
                  View resources →
                </a>
              </div>

            </div>

          </div>
        </section>

      </div>
    </>
  )
}
