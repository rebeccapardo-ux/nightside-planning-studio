import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

export default async function RitualLearnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let ritualDomainHref = '/app/plan'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .ilike('title', '%ritual%')
      .limit(1)
    if (domains && domains.length > 0) {
      ritualDomainHref = `/app/domains/${domains[0].id}`
    }
  }

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
        .rc-why-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 72px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .rc-why-grid { grid-template-columns: 1fr; gap: 40px; }
        }
      `}</style>

      <div>

        {/* ── 1. HERO ── navy */}
        <section style={{ background: '#2C3777' }}>
          <div style={{ ...inner, paddingTop: '80px', paddingBottom: '88px' }}>

            <div style={{ marginBottom: 24 }}>
              <Breadcrumbs
                theme="navy"
                items={[
                  { label: 'Learn', href: '/app/learn' },
                  { label: 'Ritual & Ceremony' },
                ]}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h1 className="ns-title-activity" style={{ color: '#FFFFFF', margin: 0 }}>
                Ritual &amp; Ceremony
              </h1>
            </div>

            <p className="ns-lead-activity" style={{ color: '#FFFFFF', maxWidth: '640px' }}>
              Rituals and ceremonies are meaningful ways to honor life, process loss, and create connection. They can take many forms — from formal services to small, personal moments — and reflect cultural, spiritual, or personal values.
            </p>

          </div>
        </section>

        {/* ── 2. WHY THIS MATTERS ── cream, two-column */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '72px', paddingBottom: '72px' }}>
          <div style={{ maxWidth: '1180px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '64px', paddingRight: '64px' }}>

            <h2 style={{ fontFamily: apfel, fontSize: '36px', fontWeight: 600, lineHeight: '1.05', color: '#130426', marginTop: 0, marginBottom: '48px' }}>
              Why this matters
            </h2>

            <div className="rc-why-grid">

              {/* Left column */}
              <div>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  Rituals and ceremonies are how we mark loss, honor a life, and create space for connection and remembrance. They can take many forms, from formal services to small, personal moments.
                </p>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  Without clear guidance, these decisions are often made by others in a time of grief, based on assumptions, traditions, or logistical constraints.
                </p>
              </div>

              {/* Right column */}
              <div>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  Taking time to reflect on what feels meaningful to you — whether cultural, spiritual, or personal — can help ensure these moments reflect your values and identity.
                </p>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  It can also make things easier for the people planning on your behalf, giving them clarity and confidence during an emotionally difficult time.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── 3. NOTE ── cream */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '72px', paddingBottom: '88px' }}>
          <div style={inner}>
            <div style={{ maxWidth: '680px' }}>
              <h2 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.15', color: '#130426', marginTop: 0, marginBottom: '20px' }}>
                Planning for marginalized communities
              </h2>
              <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.7', color: '#130426', marginBottom: '28px' }}>
                End-of-life planning matters for everyone, but individuals from marginalized communities often face additional barriers. Documenting your wishes clearly can help ensure they are respected.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  {
                    heading: 'Healthcare discrimination',
                    body: 'LGBTQ+ individuals may face bias in medical settings — identifying chosen family and decision-makers in advance is essential.',
                  },
                  {
                    heading: 'Cultural sensitivity',
                    body: 'Indigenous and other communities with distinct traditions may find their practices are not automatically understood or respected.',
                  },
                  {
                    heading: 'Family dynamics',
                    body: 'Preferences that differ from family expectations can create conflict — documenting your wishes reduces ambiguity.',
                  },
                  {
                    heading: 'Knowing your rights',
                    body: 'Legal rights around funerals, body care, and ceremonies vary by province — knowing your options helps ensure your wishes are followed.',
                  },
                ].map(({ heading, body }) => (
                  <div key={heading}>
                    <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.7', color: '#130426', margin: 0 }}>
                      <strong style={{ fontWeight: 600 }}>{heading}:</strong>{' '}{body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. NEXT STEPS ── deep purple */}
        <section style={{ width: '100%', background: '#130426', paddingTop: '104px', paddingBottom: '104px' }}>
          <div style={inner}>

            <h2 style={{ fontFamily: apfel, fontSize: '44px', fontWeight: 600, lineHeight: '1.12', letterSpacing: '-0.01em', color: '#FFFFFF', marginBottom: '20px' }}>
              Next steps
            </h2>
            <p style={{ fontFamily: hv, fontSize: '16px', fontWeight: 400, lineHeight: '1.5', color: 'rgba(255,255,255,0.90)', maxWidth: '620px', marginBottom: '40px' }}>
              Use these activities and resources to keep moving in your ritual &amp; ceremony planning.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>

              {/* Card 1: Relevant Activities — orange */}
              <div style={{ background: '#F29836', borderRadius: '24px', padding: '36px' }}>
                <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}>
                  Relevant Activities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { href: '/app/reflect', label: 'Reflection Prompts' },
                    { href: '/app/capture/advance-directive', label: 'Your Wishes' },
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
                <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}>
                  Explore resources for equitable and culturally-sensitive planning
                </h3>
                <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.7', color: '#130426', marginBottom: '28px' }}>
                  Without clear plans, wishes related to gender identity, sexuality, cultural practices, or religious traditions may not be honored. It&apos;s important to understand your rights and options for funeral practices and body care.
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

            {/* Continue in your plan — lavender */}
            <div style={{ marginTop: '24px', maxWidth: '760px' }}>
              <div style={{ background: '#DBD2F6', borderRadius: '24px', padding: '36px' }}>
                <div style={{ maxWidth: '480px' }}>
                  <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '24px' }}>
                    Continue in your plan
                  </h3>
                  <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginBottom: '32px' }}>
                    Document your preferences for rituals, ceremonies, and remembrance so they can be carried out in a way that reflects your values and identity.
                  </p>
                  <Link
                    href={ritualDomainHref}
                    className="inline-block hover:opacity-90 transition-opacity"
                    style={{ fontFamily: hv, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px', background: '#130426', color: '#FFFFFF' }}
                  >
                    Go to Ritual &amp; Ceremony Planning →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </>
  )
}
