import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import WillsAnimations from './WillsAnimations'

export default async function WillsLearnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let willsDomainHref = '/app/materials'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .ilike('title', '%wills%')
      .limit(1)
    if (domains && domains.length > 0) {
      willsDomainHref = `/app/domains/${domains[0].id}`
    }
  }

  const apfel = "'ApfelGrotezk', sans-serif"
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const inner = { maxWidth: '1280px', marginLeft: 'auto' as const, marginRight: 'auto' as const, paddingLeft: '64px', paddingRight: '64px' }

  return (
    <>
      <style>{`
        .wl-animate {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 400ms ease-out, transform 400ms ease-out;
        }
        .wl-animate.wl-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .wl-underline {
          position: relative;
          display: inline;
        }
        .wl-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 3px;
          background: #130426;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms ease-out 100ms;
        }
        .wl-animate.wl-visible .wl-underline::after {
          transform: scaleX(1);
        }
        .wl-activity-row {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-radius: 12px;
          background: rgba(0,0,0,0.06);
          text-decoration: none;
          transition: background 150ms ease;
        }
        .wl-activity-row:hover {
          background: rgba(0,0,0,0.12);
        }
        .wl-activity-row:hover .wl-arrow {
          transform: translateX(4px);
        }
        .wl-activity-row:focus-visible {
          outline: 2px solid #130426;
          outline-offset: 2px;
        }
        .wl-arrow {
          font-size: 18px;
          opacity: 0.6;
          transition: transform 150ms ease;
          flex-shrink: 0;
        }
        .wl-why-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 72px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .wl-why-grid { grid-template-columns: 1fr; gap: 40px; }
        }
      `}</style>
      <WillsAnimations />

      <div>

        {/* ── 1. HERO ── coral */}
        <section style={{ background: '#DB5835' }}>
          <div style={{ ...inner, paddingTop: '80px', paddingBottom: '88px' }}>

            <Link
              href="/app/learn/areas"
              className="hover:opacity-75 transition-opacity"
              style={{ fontFamily: hv, fontSize: '16px', fontWeight: 500, lineHeight: '1.4', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '24px' }}
            >
              ← Areas of planning
            </Link>

            <div style={{ marginBottom: '16px' }}>
              <h1 className="ns-title-activity" style={{ color: '#FFFFFF', margin: 0 }}>
                Wills &amp; Estates
              </h1>
            </div>

            <p className="ns-lead-activity"
              style={{ color: '#FFFFFF', maxWidth: '640px' }}
            >
              A will is a legal document that outlines how your assets, debts, and belongings will be handled after your death. It names an executor, identifies beneficiaries, appoints guardians for minor children or pets, and can include provisions for charitable donations or trusts. While essential, a will is just one part of estate planning—a broader process for managing your assets and property during your lifetime and beyond.
            </p>

          </div>
        </section>

        {/* ── 2. WHY THIS MATTERS ── cream, two-column */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '72px', paddingBottom: '72px' }}>
          <div style={{ maxWidth: '1180px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '64px', paddingRight: '64px' }}>

            <h2 className="wl-animate" style={{ fontFamily: apfel, fontSize: '36px', fontWeight: 600, lineHeight: '1.05', color: '#130426', marginTop: 0, marginBottom: '48px' }}>
              Why this matters
            </h2>

            <div className="wl-why-grid">

              {/* Left column */}
              <div className="wl-animate">
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  <strong style={{ fontWeight: 600 }}>If you die without a will, the law determines how your estate is distributed</strong>, regardless of your personal relationships, priorities, or intentions. This can lead to delays, conflict, and outcomes that don&apos;t reflect what you would have wanted.
                </p>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  A will allows you to name beneficiaries, appoint an executor, and make decisions about guardianship, assets, and distribution, ensuring your wishes are clearly documented and legally recognized.
                </p>
              </div>

              {/* Right column */}
              <div className="wl-animate">
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  A will is just one part of estate planning. A complete plan considers how your finances, assets, and responsibilities are managed both during your lifetime and after your death.
                </p>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  Life changes, such as marriage, divorce, or new family members, can affect your plan. Reviewing and updating your documents over time helps ensure they continue to reflect your wishes.
                </p>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  Without clear planning, loved ones may be left to navigate legal and financial decisions under pressure, often with limited guidance.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── 3. ESTATE PLANNING OVERVIEW ── cream */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '72px', paddingBottom: '72px' }}>
          <div style={inner}>
            <div style={{ maxWidth: '620px' }}>
              <h2 className="wl-animate" style={{ fontFamily: apfel, fontSize: '36px', fontWeight: 600, lineHeight: '1.05', color: '#130426', marginTop: 0, marginBottom: '40px' }}>
                An estate plan may also include
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { term: 'Powers of Attorney', detail: 'Managing financial or legal decisions if you\'re unable to.' },
                  { term: 'Trusts', detail: 'Managing assets for specific purposes or beneficiaries.' },
                  { term: 'Life Insurance', detail: 'Providing financial support for loved ones.' },
                  { term: 'Asset and Liability Documentation', detail: 'Listing property, debts, and accounts.' },
                  { term: 'Tax Strategies', detail: 'Supporting efficient distribution of your estate.' },
                ].map(({ term, detail }) => (
                  <li key={term} style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginBottom: '16px' }}>
                    <strong style={{ fontWeight: 600 }}>{term}:</strong>{' '}{detail}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 5. NEXT STEPS ── navy */}
        <section style={{ width: '100%', background: '#2C3777', paddingTop: '104px', paddingBottom: '104px' }}>
          <div style={inner}>

            <div className="wl-animate">
              <h2
                style={{ fontFamily: apfel, fontSize: '44px', fontWeight: 600, lineHeight: '1.12', letterSpacing: '-0.01em', color: '#FFFFFF', marginBottom: '20px' }}
              >
                Next steps
              </h2>
            </div>
            <p
              style={{ fontFamily: hv, fontSize: '16px', fontWeight: 400, lineHeight: '1.5', color: 'rgba(255,255,255,0.90)', maxWidth: '620px', marginBottom: '40px' }}
            >
              Use these activities and resources to keep moving in your will and estate planning.
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
                    { href: '/app/materials', label: 'Estate Planning Resources' },
                  ].map(({ href, label }) => (
                    <Link key={label} href={href} className="wl-activity-row" style={{ display: 'flex', width: '100%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: hv, fontSize: '18px', fontWeight: 500, lineHeight: '1.5', color: '#130426' }}>
                          {label}
                        </span>
                        <span className="wl-arrow" style={{ color: '#130426', fontSize: '18px', opacity: 0.6 }}>→</span>
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
                  Provincial rules vary on wills and estates. In the Resource Hub, you'll find province-specific templates and guides for creating a valid will.
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

            {/* Row 2: Continue in your plan — light lavender */}
            <div style={{ marginTop: '24px', maxWidth: '760px', height: 'auto' }}>
              <div style={{ background: '#DBD2F6', borderRadius: '24px', padding: '36px', height: 'auto' }}>
                <div style={{ maxWidth: '480px' }}>
                  <h3
                    style={{ fontFamily: apfel, fontSize: '32px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '24px' }}
                  >
                    Continue in your plan
                  </h3>
                  <p
                    style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginBottom: '32px' }}
                  >
                    Start documenting your estate details and creating your will to ensure your wishes are carried out.
                  </p>
                  <Link
                    href={willsDomainHref}
                    className="inline-block hover:opacity-90 transition-opacity"
                    style={{ fontFamily: hv, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px', background: '#130426', color: '#FFFFFF' }}
                  >
                    Go to Wills &amp; Estates Planning →
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
