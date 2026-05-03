import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function LegacyLearnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let legacyDomainHref = '/app/materials'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .ilike('title', '%legacy%')
      .limit(1)
    if (domains && domains.length > 0) {
      legacyDomainHref = `/app/domains/${domains[0].id}`
    }
  }

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
        .lg-why-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 72px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .lg-why-grid { grid-template-columns: 1fr; gap: 40px; }
        }
      `}</style>

      <div>

        {/* ── 1. HERO ── navy */}
        <section style={{ background: '#2C3777' }}>
          <div style={{ ...inner, paddingTop: '80px', paddingBottom: '88px' }}>

            <Link
              href="/app/learn"
              className="hover:opacity-75 transition-opacity"
              style={{ fontFamily: hv, fontSize: '16px', fontWeight: 500, lineHeight: '1.4', color: 'rgba(255,255,255,0.75)', display: 'block', marginBottom: '24px' }}
            >
              ← Back to Learn
            </Link>

            <h1 className="ns-title-activity" style={{ color: '#FFFFFF', margin: '0 0 16px 0' }}>
              Legacy Planning
            </h1>

            <p className="ns-lead-activity" style={{ color: '#FFFFFF', maxWidth: '680px' }}>
              Legacy planning focuses on how you want to be remembered and the impact you leave behind. This can include writing letters or messages for loved ones, creating personal projects, or documenting your life story. It also encompasses decisions about how your values, beliefs, and achievements are celebrated or shared after your death, such as ensuring the correct pronouns are used in your obituary or being remembered in ways that reflect your true self.
            </p>

          </div>
        </section>

        {/* ── 2. WHY THIS MATTERS ── cream, two-column */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '72px', paddingBottom: '72px' }}>
          <div style={{ maxWidth: '1180px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '64px', paddingRight: '64px' }}>

            <h2 style={{ fontFamily: apfel, fontSize: '36px', fontWeight: 600, lineHeight: '1.05', color: '#130426', marginTop: 0, marginBottom: '48px' }}>
              Why this matters
            </h2>

            <div className="lg-why-grid">

              {/* Left column */}
              <div>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  Reflecting on your legacy gives you the opportunity to shape how you are remembered and what you leave behind, beyond financial or legal matters.
                </p>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  This might include writing letters, recording personal stories, or creating projects that express your values, identity, and relationships.
                </p>
              </div>

              {/* Right column */}
              <div>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  Without intentional reflection, these aspects of your life are often left undefined or interpreted by others.
                </p>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  Taking time to consider how you want to be remembered, and communicating those wishes, can create clarity, connection, and meaning for the people in your life.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── 3. NEXT STEPS ── deep purple */}
        <section style={{ width: '100%', background: '#130426', paddingTop: '104px', paddingBottom: '104px' }}>
          <div style={inner}>

            <h2 style={{ fontFamily: apfel, fontSize: '44px', fontWeight: 600, lineHeight: '1.12', letterSpacing: '0.01em', color: '#FFFFFF', marginBottom: '12px' }}>
              Next steps
            </h2>
            <p style={{ fontFamily: hv, fontSize: '16px', fontWeight: 400, lineHeight: '1.5', color: 'rgba(255,255,255,0.90)', maxWidth: '620px', marginBottom: '40px' }}>
              Use these activities and resources to keep moving in your legacy planning.
            </p>

            {/* Activities card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
              <div style={{ background: '#F29836', borderRadius: '24px', padding: '36px' }}>
                <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}>
                  Relevant Activities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { href: '/app/explore/legacy-map', label: 'Legacy Map' },
                    { href: '/app/capture/advance-directive', label: 'Your Wishes' },
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

            {/* Continue in your plan card */}
            <div style={{ marginTop: '24px', maxWidth: '760px' }}>
              <div style={{ background: '#DBD2F6', borderRadius: '24px', padding: '36px' }}>
                <div style={{ maxWidth: '480px' }}>
                  <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '24px' }}>
                    Continue in your plan
                  </h3>
                  <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginBottom: '32px' }}>
                    Document your legacy preferences, messages, and personal reflections so they can be preserved and shared as intended.
                  </p>
                  <Link
                    href={legacyDomainHref}
                    className="inline-block hover:opacity-90 transition-opacity"
                    style={{ fontFamily: hv, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px', background: '#130426', color: '#FFFFFF' }}
                  >
                    Go to Legacy Planning →
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
