import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import HealthcareAnimations from './HealthcareAnimations'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

export default async function HealthcareLearnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let healthcareDomainHref = '/app/plan'
  if (user) {
    const { data: domains } = await supabase
      .from('containers')
      .select('id, title')
      .eq('type', 'domain')
      .ilike('title', '%healthcare%')
      .limit(1)
    if (domains && domains.length > 0) {
      healthcareDomainHref = `/app/domains/${domains[0].id}`
    }
  }

  const apfel = "'ApfelGrotezk', sans-serif"
  const inter = "'Inter', system-ui, -apple-system, sans-serif"
  const inner = { maxWidth: '1280px', marginLeft: 'auto' as const, marginRight: 'auto' as const }

  const accentUnderline: React.CSSProperties = {
    textDecoration: 'underline',
    textDecorationColor: '#F29836',
    textDecorationThickness: '3px',
    textUnderlineOffset: '3px',
  }

  const em = (text: string, color = '#FFFFFF') => (
    <strong style={{ fontWeight: 600, color }}>{text}</strong>
  )

  return (
    <>
      <style>{`
        .hc-animate {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 650ms cubic-bezier(0.22, 1, 0.36, 1),
                      transform 650ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hc-animate.hc-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .hc-underline {
          position: relative;
          display: inline;
        }
        .hc-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 3px;
          background: #f29836;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms ease-out 100ms;
        }
        .hc-animate.hc-visible .hc-underline::after {
          transform: scaleX(1);
        }
        .hc-activity-row {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-radius: 12px;
          background: rgba(0,0,0,0.06);
          text-decoration: none;
          transition: background 150ms ease;
        }
        .hc-activity-row:hover { background: rgba(0,0,0,0.12); }
        .hc-activity-row:hover .hc-arrow { transform: translateX(4px); }
        .hc-activity-row:focus-visible { outline: 2px solid #1F1A44; outline-offset: 2px; }
        .hc-arrow {
          font-size: 18px;
          opacity: 0.6;
          transition: transform 150ms ease;
          flex-shrink: 0;
        }
        .sdm-question::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #F28C38;
          font-weight: 500;
        }
        .hc-why-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 72px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .hc-why-grid { grid-template-columns: 1fr; gap: 40px; }
        }
        @media (max-width: 767px) {
          .learn-next-steps-row { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
      <HealthcareAnimations />

      <div>

        {/* ── 1. HERO ── */}
        <section style={{ background: '#2C3777' }}>
          <div className="px-5 md:px-16" style={{ ...inner, paddingTop: '80px', paddingBottom: '88px' }}>
            <div style={{ marginBottom: 24 }}>
              <Breadcrumbs
                theme="navy"
                items={[
                  { label: 'Learn', href: '/app/learn' },
                  { label: 'Healthcare Wishes' },
                ]}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <h1 className="ns-title-activity" style={{ color: '#FFFFFF', margin: 0 }}>
                <span className="hc-underline">Healthcare Wishes</span>
              </h1>
            </div>
            <p className="ns-lead-activity"
              style={{ color: '#FFFFFF', maxWidth: '520px' }}
            >
              Advance care planning helps prepare for a time when you may be seriously ill or unable to speak for yourself. It involves reflecting on and communicating your wishes, appointing a Substitute Decision-Maker, and documenting your preferences (legal documentation varies by province; see below).
            </p>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <div style={{ width: '100%', background: '#F8F4EB', paddingTop: '32px', paddingBottom: '0' }}>
          <div className="px-5 md:px-16" style={{ maxWidth: '1180px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '15px', fontStyle: 'italic', color: 'rgba(19,4,38,0.70)', lineHeight: 1.6, margin: 0 }}>
              The information here is for understanding. For medical decisions, consult your healthcare team.
            </p>
          </div>
        </div>

        {/* ── 2. WHY THIS MATTERS — heading above, equal columns below ── */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '72px', paddingBottom: '72px' }}>
          <div className="px-5 md:px-16" style={{ maxWidth: '1180px', marginLeft: 'auto', marginRight: 'auto' }}>

            {/* Heading spans full width above both columns */}
            <h2 className="hc-animate" style={{ fontFamily: apfel, fontSize: '36px', fontWeight: 600, lineHeight: '1.05', color: '#130426', marginTop: 0, marginBottom: '48px' }}>
              Why this matters
            </h2>

            {/* Equal columns */}
            <div className="hc-why-grid">

              {/* Left column */}
              <div className="hc-animate">
                <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '18px', lineHeight: '1.55', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  Without clear communication, your loved ones and care providers may face painful choices, uncertainty, and conflict.
                </p>
                <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '18px', lineHeight: '1.55', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  Many people approach advance care planning by listing treatments they would or wouldn&apos;t want. While that can be helpful, {em('it has limits', '#130426')}.
                </p>
                <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '18px', lineHeight: '1.55', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  That&apos;s why this platform goes beyond checklists, with activities designed to help you reflect on the values behind those choices.
                </p>
              </div>

              {/* Right column */}
              <div className="hc-animate">
                <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '18px', lineHeight: '1.55', color: '#130426', marginTop: 0, marginBottom: '30px' }}>
                  It&apos;s hard to predict how you&apos;d feel in a situation you&apos;ve never been in, and <strong style={{ fontWeight: 600 }}>ableist assumptions about what life with illness or disability might be like can distort decisions.</strong>
                </p>
                <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '18px', lineHeight: '1.55', color: '#130426', marginTop: 0, marginBottom: '24px' }}>
                  For example, someone might say &ldquo;no machines&rdquo; without knowing the range of options or experiences, or assume they wouldn&apos;t want to live without being able to speak, without realizing what assistive tools exist.
                </p>
                <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '18px', lineHeight: '1.55', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                  By reflecting on your values and priorities, you can give your Substitute Decision-Maker the context they need to make thoughtful decisions on your behalf—even in unexpected situations.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── 3. CHOOSING SDM — soft inset panel ── */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '64px', paddingBottom: '112px' }}>
          <div className="px-5 md:px-16" style={{ maxWidth: '1180px', marginLeft: 'auto', marginRight: 'auto' }}>
            <div className="hc-animate">
              <div style={{
                background: 'rgba(187,171,244,0.12)',
                border: '1px solid rgba(19,4,38,0.1)',
                borderRadius: '16px',
                padding: '32px',
              }}>
                <h2 style={{ fontFamily: apfel, fontSize: '26px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginTop: 0, marginBottom: '16px' }}>
                  Choosing your Substitute Decision-Maker
                </h2>
                <p style={{ fontFamily: inter, fontSize: '16px', lineHeight: '1.65', color: '#130426', marginTop: 0, marginBottom: '20px' }}>
                  If someone had to speak on your behalf, what would you want them to understand?
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {[
                    'Do they understand my values?',
                    'Can I trust them to speak up for me?',
                    'Are they able to handle tough conversations under pressure?',
                  ].map((q) => (
                    <li
                      key={q}
                      className="sdm-question"
                      style={{
                        fontFamily: inter,
                        fontSize: '16px',
                        lineHeight: '1.65',
                        color: '#130426',
                        marginBottom: '12px',
                        paddingLeft: '20px',
                        position: 'relative',
                      }}
                    >
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. NEXT STEPS — action surface, no motion ── */}
        <section style={{ width: '100%', background: '#2A1450', paddingTop: '112px', paddingBottom: '120px' }}>
          <div className="px-5 md:px-16" style={inner}>
            <h2
              style={{ fontFamily: apfel, fontSize: '44px', fontWeight: 600, lineHeight: '1.2', letterSpacing: '0.01em', color: '#FFFFFF', marginBottom: '12px' }}
            >
              Next steps
            </h2>
            <p
              style={{ fontFamily: inter, fontSize: '16px', fontWeight: 400, lineHeight: '1.5', color: 'rgba(255,255,255,0.90)', maxWidth: '620px', marginBottom: '40px' }}
            >
              Use these activities and resources to keep moving in your healthcare planning.
            </p>

            {/* Row 1: Relevant Activities + Resources */}
            <div className="learn-next-steps-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>

              <div style={{ background: '#F29836', borderRadius: '24px', padding: '36px' }}>
                <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}>
                  Relevant Activities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { href: '/app/reflect/values-and-fears', label: 'Values and Fears Ranking' },
                    { href: '/app/reflect',    label: 'Reflection Prompts' },
                    { href: '/app/reflect/scenario-navigator',    label: 'Scenario Navigator' },
                  ].map(({ href, label }) => (
                    <Link key={label} href={href} className="hc-activity-row" style={{ display: 'flex', width: '100%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: inter, fontSize: '18px', fontWeight: 500, lineHeight: '1.5', color: '#1F1A44' }}>{label}</span>
                        <span className="hc-arrow" style={{ color: '#1F1A44', fontSize: '18px', opacity: 0.6 }}>→</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div style={{ background: '#F8F4EB', borderRadius: '24px', padding: '36px' }}>
                <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}>
                  Explore province-specific resources
                </h3>
                <p style={{ fontFamily: inter, fontSize: '18px', fontWeight: 400, lineHeight: '1.7', color: '#130426', marginBottom: '28px' }}>
                  It&apos;s important to know that legal requirements vary by province. In the Resource Hub, you&apos;ll find province-specific templates for things like designating a decision-maker or completing an Advance Directive.
                </p>
                <a
                  href="https://thenightside.net/resources"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block hover:opacity-90 transition-opacity"
                  style={{ background: '#DB5835', color: '#130426', fontFamily: inter, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px' }}
                >
                  View resources →
                </a>
              </div>

            </div>

            {/* Row 2: Continue in your plan */}
            <div style={{ marginTop: '24px', maxWidth: '760px' }}>
              <div style={{ background: '#DBD2F6', borderRadius: '24px', padding: '36px' }}>
                <div style={{ maxWidth: '480px' }}>
                  <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '24px' }}>
                    Continue in your plan
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                    {['Identify a decision-maker', 'Document your healthcare preferences'].map((item) => (
                      <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                        <span style={{ color: '#130426', fontWeight: 700, flexShrink: 0, lineHeight: '1.75' }}>·</span>
                        <span style={{ fontFamily: inter, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={healthcareDomainHref}
                    className="inline-block hover:opacity-90 transition-opacity"
                    style={{ fontFamily: inter, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px', background: '#130426', color: '#FFFFFF' }}
                  >
                    Go to Healthcare Planning →
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
