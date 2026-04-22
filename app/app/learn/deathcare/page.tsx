import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import DeathcareAnimations from './DeathcareAnimations'

export default async function DeathcareLearnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let deathcareDomainHref = '/app/materials'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .ilike('title', '%deathcare%')
      .limit(1)
    if (domains && domains.length > 0) {
      deathcareDomainHref = `/app/domains/${domains[0].id}`
    }
  }

  const apfel = "'ApfelGrotezk', sans-serif"
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const inner = { maxWidth: '1280px', marginLeft: 'auto' as const, marginRight: 'auto' as const, paddingLeft: '64px', paddingRight: '64px' }

  return (
    <>
      <style>{`
        .dc-animate {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 400ms ease-out, transform 400ms ease-out;
        }
        .dc-animate.dc-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .dc-underline {
          position: relative;
          display: inline;
        }
        .dc-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 3px;
          background: #DB5835;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms ease-out 100ms;
        }
        .dc-animate.dc-visible .dc-underline::after {
          transform: scaleX(1);
        }
        .dc-activity-row {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-radius: 12px;
          background: rgba(0,0,0,0.06);
          text-decoration: none;
          transition: background 150ms ease;
        }
        .dc-activity-row:hover {
          background: rgba(0,0,0,0.12);
        }
        .dc-activity-row:hover .dc-arrow {
          transform: translateX(4px);
        }
        .dc-activity-row:focus-visible {
          outline: 2px solid #130426;
          outline-offset: 2px;
        }
        .dc-arrow {
          font-size: 18px;
          opacity: 0.6;
          transition: transform 150ms ease;
          flex-shrink: 0;
        }
      `}</style>
      <DeathcareAnimations />

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

            <div className="dc-animate" style={{ marginBottom: '40px' }}>
              <h1 className="ns-title-activity" style={{ color: '#FFFFFF', margin: 0 }}>
                <span className="dc-underline">Deathcare &amp; Body Disposition</span>
              </h1>
            </div>

            <p className="ns-lead-activity"
              style={{ color: '#FFFFFF', maxWidth: '640px' }}
            >
              Deathcare planning involves decisions about how your body will be cared for after you die. This includes choosing a final resting place for your body, such as traditional burial, cremation, green burial, or alternative methods like aquamation. Without clear instructions, decisions may be made based on default practices, family assumptions, or costs rather than personal wishes.
            </p>

          </div>
        </section>

        {/* ── 2. WHY THIS MATTERS ── cream */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '96px', paddingBottom: '96px' }}>
          <div style={inner}>
            <div style={{ maxWidth: '620px' }}>
              <div className="dc-animate">
                <h2
                  style={{ fontFamily: apfel, fontSize: '40px', fontWeight: 600, lineHeight: '1.15', letterSpacing: '-0.01em', color: '#1F1A44', marginTop: 0, marginBottom: '28px' }}
                >
                  Why this matters
                </h2>
              </div>
              <p
                style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', marginBottom: '24px' }}
              >
                Planning ahead ensures your choices reflect your values—spiritual, environmental, cultural, or personal—and reduces stress for loved ones.
              </p>
              <p
                style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', marginBottom: 0 }}
              >
                Your preferences for body disposition should be documented in your will to ensure they are legally recognized.
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. NEXT STEPS ── deep purple */}
        <section style={{ width: '100%', background: '#130426', paddingTop: '104px', paddingBottom: '104px' }}>
          <div style={inner}>

            <div className="dc-animate">
              <h2
                style={{ fontFamily: apfel, fontSize: '44px', fontWeight: 600, lineHeight: '1.12', letterSpacing: '-0.01em', color: '#FFFFFF', marginBottom: '20px' }}
              >
                Next steps
              </h2>
            </div>
            <p
              style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.6', color: 'rgba(255,255,255,0.75)', maxWidth: '620px', marginBottom: '40px' }}
            >
              Use these activities and resources to keep moving.
            </p>

            {/* Row 1: Relevant Activities + Resources */}
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
                    { href: '/app/learn/trivia', label: 'Deathcare Trivia' },
                  ].map(({ href, label }) => (
                    <Link key={label} href={href} className="dc-activity-row" style={{ display: 'flex', width: '100%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: hv, fontSize: '18px', fontWeight: 500, lineHeight: '1.5', color: '#130426' }}>
                          {label}
                        </span>
                        <span className="dc-arrow" style={{ color: '#130426', fontSize: '18px', opacity: 0.6 }}>→</span>
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
                  Explore province-specific resources
                </h3>
                <p
                  style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.7', color: '#130426', marginBottom: '28px' }}
                >
                  Options for body disposition vary across provinces. For example, green burial and aquamation may not be available everywhere, and provincial laws may regulate burial locations or ashes scattering. Understanding these specifics ensures your preferences can be carried out.
                </p>
                <a
                  href="https://thenightside.net/resources"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block hover:opacity-90 transition-opacity"
                  style={{ background: '#DB5835', color: '#FFFFFF', fontFamily: hv, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px' }}
                >
                  View resources →
                </a>
              </div>

            </div>

            {/* Row 2: Continue in your plan — lavender */}
            <div style={{ marginTop: '24px', maxWidth: '760px', height: 'auto' }}>
              <div style={{ background: '#BBABF4', borderRadius: '24px', padding: '36px', height: 'auto' }}>
                <div style={{ maxWidth: '480px' }}>
                  <h3
                    style={{ fontFamily: apfel, fontSize: '32px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '24px' }}
                  >
                    Continue in your plan
                  </h3>
                  <p
                    style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginBottom: '32px' }}
                  >
                    Documenting your preferences and sharing your choices with loved ones and decision makers ensures they understand your wishes and can carry them out.
                  </p>
                  <Link
                    href={deathcareDomainHref}
                    className="inline-block hover:opacity-90 transition-opacity"
                    style={{ fontFamily: hv, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px', background: '#130426', color: '#FFFFFF' }}
                  >
                    Go to Deathcare Materials →
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
