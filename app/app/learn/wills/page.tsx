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

            <div className="wl-animate" style={{ marginBottom: '40px' }}>
              <h1 className="ns-title-activity" style={{ color: '#FFFFFF', margin: 0 }}>
                <span className="wl-underline">Wills &amp; Estates</span>
              </h1>
            </div>

            <p className="ns-lead-activity"
              style={{ color: '#FFFFFF', maxWidth: '640px' }}
            >
              A will is a legal document that outlines how your assets, debts, and belongings will be handled after your death. It names an executor, identifies beneficiaries, appoints guardians for minor children or pets, and can include provisions for charitable donations or trusts. While essential, a will is just one part of estate planning—a broader process for managing your assets and property during your lifetime and beyond.
            </p>

          </div>
        </section>

        {/* ── 2. WHY THIS MATTERS ── cream */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '96px', paddingBottom: '96px' }}>
          <div style={inner}>
            <div style={{ maxWidth: '620px' }}>
              <div className="wl-animate">
                <h2
                  style={{ fontFamily: apfel, fontSize: '40px', fontWeight: 600, lineHeight: '1.15', letterSpacing: '-0.01em', color: '#1F1A44', marginTop: 0, marginBottom: '28px' }}
                >
                  Why this matters
                </h2>
              </div>
              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', marginBottom: '24px' }}>
                If you die intestate (without a will), the law decides who inherits and manages your estate, potentially causing delays, conflicts, and decisions that don't reflect your wishes.
              </p>
              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', marginBottom: '24px' }}>
                For First Nations individuals living on reserves, the Indian Act determines asset distribution, not personal wishes, meaning only family can inherit—excluding friends or charities.
              </p>
              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#1F1A44', marginBottom: 0 }}>
                Anyone of legal age should have a will. It's especially important for those with dependents, significant assets, or specific wishes. Regular updates ensure it reflects life changes, like marriage, divorce, or new family members.
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. WRITING A LEGAL WILL ── deep purple */}
        <section style={{ width: '100%', background: '#130426', paddingTop: '96px', paddingBottom: '96px' }}>
          <div style={inner}>
            <div style={{ maxWidth: '620px' }}>
              <div className="wl-animate">
                <h2
                  style={{ fontFamily: apfel, fontSize: '40px', fontWeight: 600, lineHeight: '1.15', letterSpacing: '-0.01em', color: '#FFFFFF', marginTop: 0, marginBottom: '28px' }}
                >
                  Writing a legal will
                </h2>
              </div>
              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: 'rgba(255,255,255,0.85)', marginBottom: '28px' }}>
                While requirements vary across provinces, here are general guidelines to create a valid will in Canada:
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { term: 'Age and Mental Capacity', detail: 'You must be of sound mind and the age of majority (usually 18). Exceptions may apply for minors in certain cases, like marriage or military service.' },
                  { term: 'Written and Signed', detail: 'A will must be written (typically typed and printed) and signed by you at the end. British Columbia also allows electronic wills.' },
                  { term: 'Witnesses', detail: 'Two witnesses (not beneficiaries or their spouses) must watch you sign and sign the document themselves.' },
                  { term: 'Handwritten Wills', detail: 'Holographic (handwritten) wills are valid in some provinces, like Ontario, but not everywhere.' },
                  { term: 'Safe Storage', detail: 'Store the original signed copy in a secure place.' },
                ].map(({ term, detail }) => (
                  <li key={term} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
                    <span style={{ color: '#F29836', flexShrink: 0, lineHeight: '1.8', fontWeight: 700 }}>·</span>
                    <span style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
                      <strong style={{ color: '#FFFFFF', fontWeight: 600 }}>{term}:</strong>{' '}{detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 4. ESTATE PLANNING OVERVIEW ── cream */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '88px', paddingBottom: '88px' }}>
          <div style={inner}>
            <div style={{ maxWidth: '760px' }}>
              <div className="wl-animate">
                <h2
                  style={{ fontFamily: apfel, fontSize: '40px', fontWeight: 600, lineHeight: '1.15', letterSpacing: '-0.01em', color: '#130426', marginBottom: '24px' }}
                >
                  An estate plan may also include
                </h2>
              </div>
              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.75', color: '#130426', maxWidth: '620px', marginBottom: '32px' }}>
                Beyond a will, a complete estate plan addresses how your finances, assets, and people are cared for during your lifetime and after.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxWidth: '620px' }}>
                {[
                  { term: 'Powers of Attorney', detail: 'Appointing someone to manage your finances or legal matters if you\'re unable to.' },
                  { term: 'Trusts', detail: 'Managing assets for specific purposes or beneficiaries.' },
                  { term: 'Life Insurance Policies', detail: 'Providing financial security for loved ones.' },
                  { term: 'Asset and Liability Documentation', detail: 'Listing property, debts, and digital accounts.' },
                  { term: 'Tax Strategies', detail: 'Reducing taxes and ensuring efficient distribution of your estate.' },
                ].map(({ term, detail }) => (
                  <li key={term} style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: '#130426', marginBottom: '18px' }}>
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
                    Go to Wills &amp; Estates Materials →
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
