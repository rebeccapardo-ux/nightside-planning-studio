import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import PersonalAdminAnimations from './PersonalAdminAnimations'

export default async function PersonalAdminLearnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let personalAdminDomainHref = '/app/materials'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .ilike('title', '%personal%')
      .limit(1)
    if (domains && domains.length > 0) {
      personalAdminDomainHref = `/app/domains/${domains[0].id}`
    }
  }

  const apfel = "'ApfelGrotezk', sans-serif"
  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const inner = { maxWidth: '1280px', marginLeft: 'auto' as const, marginRight: 'auto' as const, paddingLeft: '64px', paddingRight: '64px' }

  const coverItems = [
    {
      term: 'Who you are and how to reach the people who matter',
      detail: 'Basic information, emergency contacts, and who should be notified.',
    },
    {
      term: 'Your financial life',
      detail: 'Accounts, debts, insurance — enough to know what exists and where to look.',
    },
    {
      term: 'Your digital life',
      detail: 'Email, social media, subscriptions, and what should happen to those accounts.',
    },
    {
      term: 'Passwords and access',
      detail: 'How trusted people can access what they need.',
    },
    {
      term: 'Devices',
      detail: 'Who should have access to your phone, computer, or other devices.',
    },
  ]

  return (
    <>
      <style>{`
        .pa-animate {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 400ms ease-out, transform 400ms ease-out;
        }
        .pa-animate.pa-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .pa-underline {
          position: relative;
          display: inline;
        }
        .pa-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 3px;
          background: #F8F4EB;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms ease-out 100ms;
        }
        .pa-animate.pa-visible .pa-underline::after {
          transform: scaleX(1);
        }
        .pa-why-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 72px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .pa-why-grid { grid-template-columns: 1fr; gap: 40px; }
        }
      `}</style>
      <PersonalAdminAnimations />

      <div>

        {/* ── 1. HERO ── navy */}
        <section style={{ background: '#2C3777' }}>
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
                Personal Admin
              </h1>
            </div>

            <p className="ns-lead-activity" style={{ color: '#FFFFFF', maxWidth: '640px' }}>
              The practical details of your life — your accounts, passwords, contacts, and digital presence — rarely feel urgent until they&apos;re urgently needed. Getting this information organized is one of the quietest and most considerate things you can do for the people you love.
            </p>

          </div>
        </section>

        {/* ── 2. WHY THIS MATTERS ── cream, two-column */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '72px', paddingBottom: '72px' }}>
          <div style={{ maxWidth: '1180px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '64px', paddingRight: '64px' }}>

            <h2 className="pa-animate" style={{ fontFamily: apfel, fontSize: '36px', fontWeight: 600, lineHeight: '1.05', color: '#130426', marginTop: 0, marginBottom: '48px' }}>
              Why this matters
            </h2>

            <div className="pa-why-grid">

              {/* Left column */}
              <div className="pa-animate">
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  When someone dies, the people they leave behind are already carrying a lot. Grief is hard enough on its own, but it often arrives alongside a cascade of practical tasks: locating accounts, tracking down passwords, notifying institutions, and figuring out what exists and how to cancel or access it.
                </p>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  For many families, this administrative burden lands at the worst possible moment, with no roadmap and no preparation.
                </p>
              </div>

              {/* Right column */}
              <div className="pa-animate">
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  The good news is that <strong style={{ fontWeight: 600 }}>a little organization now can make an enormous difference later</strong>. You don&apos;t need to have everything figured out; you just need to leave enough of a trail that the people you love aren&apos;t starting from zero.
                </p>
                <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  Even small steps can reduce confusion, save time, and ease stress during an already difficult period.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── 3. WHAT PERSONAL ADMIN COVERS ── deep purple */}
        <section style={{ width: '100%', background: '#130426', paddingTop: '96px', paddingBottom: '96px' }}>
          <div style={inner}>
            <div style={{ maxWidth: '620px' }}>
              <div className="pa-animate">
                <h2 style={{ fontFamily: apfel, fontSize: '40px', fontWeight: 600, lineHeight: '1.15', letterSpacing: '-0.01em', color: '#FFFFFF', marginTop: 0, marginBottom: '28px' }}>
                  What personal admin covers
                </h2>
              </div>
              <p style={{ fontFamily: hv, fontSize: '19px', fontWeight: 400, lineHeight: '1.8', color: 'rgba(255,255,255,0.85)', marginBottom: '28px' }}>
                Personal admin in the context of death planning is about making sure the practical details of your life are documented somewhere accessible. That includes:
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {coverItems.map(({ term, detail }) => (
                  <li key={term} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '24px' }}>
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

        {/* ── 5. NEXT STEPS ── navy */}
        <section style={{ width: '100%', background: '#2C3777', paddingTop: '104px', paddingBottom: '104px' }}>
          <div style={inner}>

            <h2 style={{ fontFamily: apfel, fontSize: '44px', fontWeight: 600, lineHeight: '1.12', letterSpacing: '-0.01em', color: '#FFFFFF', marginBottom: '20px' }}>
              Next steps
            </h2>
            <p style={{ fontFamily: hv, fontSize: '16px', fontWeight: 400, lineHeight: '1.5', color: 'rgba(255,255,255,0.90)', maxWidth: '620px', marginBottom: '40px' }}>
              Use these resources to keep moving in your personal admin planning.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>

              {/* Card 1: Explore resources — cream */}
              <div style={{ background: '#F8F4EB', borderRadius: '24px', padding: '36px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}>
                  Explore resources on digital legacy and personal admin
                </h3>
                <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.7', color: '#130426', marginBottom: '28px' }}>
                  You&apos;ll find guides on digital asset planning, password management, social media legacy, benefits, and more.
                </p>
                <a
                  href="https://thenightside.net/canada-wide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block hover:opacity-90 transition-opacity"
                  style={{ background: '#2C3777', color: '#FFFFFF', fontFamily: hv, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px', marginTop: 'auto', alignSelf: 'flex-start' }}
                >
                  View resources →
                </a>
              </div>

              {/* Card 2: Continue in your plan — lavender */}
              <div style={{ background: '#DBD2F6', borderRadius: '24px', padding: '36px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}>
                  Continue in your plan
                </h3>
                <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.7', color: '#130426', marginBottom: '28px' }}>
                  Start documenting your personal details in the Capture section — biographical info, contacts, finances, passwords, and more.
                </p>
                <Link
                  href={personalAdminDomainHref}
                  className="inline-block hover:opacity-90 transition-opacity"
                  style={{ fontFamily: hv, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px', background: '#130426', color: '#FFFFFF', marginTop: 'auto', alignSelf: 'flex-start' }}
                >
                  Go to Personal Admin Planning →
                </Link>
              </div>

            </div>

          </div>
        </section>

      </div>
    </>
  )
}
