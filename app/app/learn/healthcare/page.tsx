import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import HealthcareAnimations from './HealthcareAnimations'

export default async function HealthcareLearnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let healthcareDomainHref = '/app/materials'
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
  const inner = { maxWidth: '1280px', marginLeft: 'auto' as const, marginRight: 'auto' as const, paddingLeft: '64px', paddingRight: '64px' }

  // Underline accent — background-image approach, softer than pseudo-element
  const accentUnderline: React.CSSProperties = {
    backgroundImage: 'linear-gradient(rgba(242,140,56,0.18), rgba(242,140,56,0.18))',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 5px',
    backgroundPosition: '0 92%',
    display: 'inline',
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
          content: '–';
          position: absolute;
          left: 0;
          color: #F28C38;
          font-weight: 500;
        }
      `}</style>
      <HealthcareAnimations />

      <div>

        {/* ── 1. HERO ── */}
        <section style={{ background: '#130426' }}>
          <div style={{ ...inner, paddingTop: '80px', paddingBottom: '88px' }}>
            <Link
              href="/app/learn/areas"
              className="text-[#F29836] hover:text-[#BBABF4] transition-colors"
              style={{ fontFamily: inter, fontSize: '16px', fontWeight: 500, lineHeight: '1.5', display: 'block', marginBottom: '24px' }}
            >
              ← Areas of planning
            </Link>
            <div style={{ marginBottom: '16px' }}>
              <h1 className="ns-title-activity" style={{ color: '#FFFFFF', margin: 0 }}>
                <span className="hc-underline">Healthcare</span>
              </h1>
            </div>
            <p className="ns-lead-activity"
              style={{ color: '#FFFFFF', maxWidth: '520px' }}
            >
              Advance care planning helps prepare for a time when you may be seriously ill or unable to speak for yourself. It involves reflecting on and communicating your wishes, appointing a Substitute Decision Maker, and documenting your preferences (legal documentation varies by province; see below).
            </p>
          </div>
        </section>

        {/* ── 2a. WHY THIS MATTERS — light ── */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '96px', paddingBottom: '96px' }}>
          <div style={inner}>
            {/* scroll-reveal on full content wrapper */}
            <div className="hc-animate" style={{ maxWidth: '560px' }}>
              <h2
                style={{ fontFamily: inter, fontSize: '32px', fontWeight: 600, lineHeight: '1.35', color: '#1F1B2E', marginTop: 0, marginBottom: '32px' }}
              >
                Why this matters
              </h2>
              <p style={{ fontFamily: inter, fontSize: '18px', lineHeight: '1.75', color: '#4C4763', marginTop: 0, marginBottom: '20px' }}>
                Without clear communication, your loved ones and care providers may face{' '}
                {em('painful choices, uncertainty, and conflict', '#1F1B2E')}.
              </p>
              <p style={{ fontFamily: inter, fontSize: '18px', lineHeight: '1.75', color: '#4C4763', marginTop: 0, marginBottom: 0 }}>
                A good plan can ease their burden and help ensure{' '}
                {em('your wishes are respected', '#1F1B2E')}.
              </p>
            </div>
          </div>
        </section>

        {/* ── 2b. BEYOND CHECKLISTS — dark ── */}
        <section style={{ width: '100%', background: '#24104A', paddingTop: '120px', paddingBottom: '120px' }}>
          <div style={inner}>
            {/* scroll-reveal on full content wrapper */}
            <div className="hc-animate" style={{ maxWidth: '480px' }}>
              <h2
                style={{ fontFamily: inter, fontSize: '32px', fontWeight: 600, lineHeight: '1.35', color: '#FFFFFF', marginTop: 0, marginBottom: '40px' }}
              >
                Beyond Checklists
              </h2>

              {/* Paragraph 1 */}
              <p style={{ fontFamily: inter, fontSize: '18px', lineHeight: '1.75', color: 'rgba(255,255,255,0.72)', marginTop: 0, marginBottom: '24px' }}>
                Most people think of advance care planning as listing treatments they would or
                wouldn&apos;t want—ventilators, feeding tubes, resuscitation, etc. That approach
                can be helpful, but {em('it has limits')}. It&apos;s hard to predict how
                you&apos;d feel in a situation you&apos;ve never been in, and ableist assumptions
                about what life with illness or disability might be like can distort decisions.
                For example, someone might say &ldquo;no machines&rdquo; without knowing the range
                of options or experiences, or assume they wouldn&apos;t want to live without being
                able to speak, without realizing what assistive tools exist.
              </p>

              {/* Pivot line — the turning point */}
              <p style={{
                fontFamily: inter,
                fontSize: '20px',
                lineHeight: '1.6',
                fontWeight: 500,
                color: '#FFFFFF',
                maxWidth: '480px',
                marginTop: '32px',
                marginBottom: '28px',
              }}>
                That&apos;s why this platform goes beyond checklists, with activities designed
                to help you reflect on{' '}
                <span style={accentUnderline}>
                  {em('the values behind those choices')}
                </span>.
              </p>

              {/* Paragraph 2 — continuation */}
              <p style={{ fontFamily: inter, fontSize: '18px', lineHeight: '1.75', color: 'rgba(255,255,255,0.72)', marginTop: 0, marginBottom: 0 }}>
                The reflection exercises are designed to help you give your SDM{' '}
                {em('the context they need')} to make thoughtful decisions on your
                behalf—even in unexpected scenarios. You can choose what to share—like including
                the Values and Fears Rankings from the Reflect section, or the supplementary form
                in the Capture section alongside your Advance Directive. Doing this work with
                others, especially your SDM, can be a powerful way to start the conversation.
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. CHOOSING SDM — light ── */}
        <section style={{ width: '100%', background: '#F8F4EB', paddingTop: '112px', paddingBottom: '96px' }}>
          <div style={inner}>
            {/* scroll-reveal on full content wrapper */}
            <div className="hc-animate" style={{ maxWidth: '520px' }}>
              <h2
                style={{ fontFamily: inter, fontSize: '32px', fontWeight: 600, lineHeight: '1.35', color: '#1F1B2E', marginBottom: '24px' }}
              >
                Choosing your Substitute Decision Maker
              </h2>
              <p
                style={{ fontFamily: inter, fontSize: '18px', lineHeight: '1.65', color: '#4C4763', marginBottom: '28px' }}
              >
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
                      fontSize: '18px',
                      lineHeight: '1.65',
                      color: '#1F1B2E',
                      marginBottom: '16px',
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
        </section>

        {/* ── 4. NEXT STEPS — action surface, no motion ── */}
        <section style={{ width: '100%', background: '#2A1450', paddingTop: '96px', paddingBottom: '120px' }}>
          <div style={inner}>
            <h2
              style={{ fontFamily: apfel, fontSize: '44px', fontWeight: 600, lineHeight: '1.2', letterSpacing: '-0.01em', color: '#FFFFFF', marginBottom: '12px' }}
            >
              Next steps
            </h2>
            <p
              style={{ fontFamily: inter, fontSize: '14px', fontWeight: 400, lineHeight: '1.5', color: 'rgba(255,255,255,0.70)', maxWidth: '620px', marginBottom: '40px' }}
            >
              Use these activities and resources to keep moving.
            </p>

            {/* Row 1: Relevant Activities + Resources */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>

              <div style={{ background: '#F29836', borderRadius: '24px', padding: '36px' }}>
                <h3 style={{ fontFamily: apfel, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '20px' }}>
                  Relevant Activities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { href: '/app/reflect/values', label: 'Values and Fears Ranking' },
                    { href: '/app/learn/areas',    label: 'Reflect Prompts' },
                    { href: '/app/learn/areas',    label: 'Scenario Navigator' },
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
                  className="inline-block text-white hover:opacity-90 transition-opacity"
                  style={{ background: '#DB5835', fontFamily: inter, fontSize: '16px', fontWeight: 500, padding: '16px 28px', borderRadius: '999px' }}
                >
                  View resources →
                </a>
              </div>

            </div>

            {/* Row 2: Continue in your plan */}
            <div style={{ marginTop: '24px', maxWidth: '760px' }}>
              <div style={{ background: '#DBD2F6', borderRadius: '24px', padding: '36px' }}>
                <div style={{ maxWidth: '480px' }}>
                  <h3 style={{ fontFamily: apfel, fontSize: '32px', fontWeight: 600, lineHeight: '1.2', color: '#130426', marginBottom: '24px' }}>
                    Continue in your plan
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                    {['Identify a decision maker', 'Document your healthcare wishes'].map((item) => (
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
                    Go to Healthcare Materials →
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
