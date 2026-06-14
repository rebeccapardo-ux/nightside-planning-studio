'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import HomeOnboardingIndicator from '@/app/components/HomeOnboardingIndicator'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'ApfelGrotezk', sans-serif"

// Piece paths in local coordinates (origin = piece center)
const P1 = "M -23,-26 H 15 V -4 H 23 V 4 H 15 V 26 H -4 V 18 H -12 V 26 H -23 Z"
const P2 = "M -13,-30 H 13 V 22 H 4 V 30 H -4 V 22 H -13 V 0 H -5 V -8 H -13 Z"
const P3 = "M -32,-10 H -21 V -18 H -13 V -10 H 15 V -2 H 23 V -10 H 32 V 18 H -32 Z"

const p1Props = { fill: '#BBABF4', stroke: '#130426', strokeWidth: '1.5' }
const p2Props = { fill: '#F29836', stroke: '#130426', strokeWidth: '1.5' }
const p3Props = { fill: '#F8F4EB', stroke: '#130426', strokeWidth: '1.5' }


// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppHomePage() {
  const headingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = headingRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ns-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        .ns-title-wrap { opacity: 0; transform: translateY(12px); transition: opacity 350ms ease-out, transform 350ms ease-out; display: inline-block; }
        .ns-title-wrap.ns-visible { opacity: 1; transform: translateY(0); }
        .ns-title-underline { position: relative; display: inline; }
        .ns-title-underline::after { content: ''; position: absolute; left: 0; bottom: -5px; width: 100%; height: 4px; background: #F29836; border-radius: 999px; transform: scaleX(0); transform-origin: left; transition: transform 350ms ease-out 100ms; }
        .ns-title-wrap.ns-visible .ns-title-underline::after { transform: scaleX(1); }
        .about-link { color: #DB5835; text-decoration: none; }
        .about-link:hover { text-decoration: underline; }
        @media (max-width: 768px) {
          .approach-grid { grid-template-columns: 1fr !important; }
          .home-card-grid { grid-template-columns: 1fr !important; }
          .yto-top-row { grid-template-columns: 1fr !important; }
          .yto-cards { grid-template-columns: 1fr !important; }
          .home-approach-aside { margin-left: 0 !important; }
        }
      `}</style>

      <HomeOnboardingIndicator />

      {/* ── Cream section ── */}
      <div style={{ background: '#f8f4eb', paddingBottom: 48 }}>
        <div className="max-w-6xl mx-auto px-4 pt-16">

          <div className="mb-12">
            <h1 className="text-h1 text-[#130426] mb-4">
              Welcome to your Planning Studio
            </h1>
            <p style={{ fontFamily: hv, fontSize: 19, lineHeight: 1.7, fontWeight: 400, color: '#130426', maxWidth: '48rem', margin: 0 }}>
              A space to reflect, learn, and plan. Start anywhere, and go at your own pace.
            </p>
          </div>

          {/* Three-card grid */}
          <div className="home-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'stretch' }}>

            {/* Reflect */}
            <Link href="/app/reflect" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#BBABF4', borderRadius: 16, padding: '28px 24px 24px' }}>
              <p style={{ fontFamily: apfel, fontSize: 28, fontWeight: 500, color: '#000000', margin: '0 0 16px' }}>Reflect</p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
                <svg width="160" height="148" viewBox="0 0 140 130" style={{ overflow: 'visible' }}>
                  <g transform="translate(52,42)"><path d={P1} {...p1Props}/></g>
                  <g transform="translate(98,42)"><path d={P2} {...p2Props}/></g>
                  <g transform="translate(75,98)"><path d={P3} {...p3Props}/></g>
                </svg>
              </div>
              <div style={{ flex: 1, margin: '0 0 15px' }}>
                <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: '#000000', margin: '0 0 13px' }}>Clarify your values</p>
                <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#000000', margin: 0 }}>Explore scenarios and identify what matters most</p>
              </div>
              <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#26215C', color: '#F8F4EB', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 500, fontFamily: hv }}>Open →</span>
            </Link>

            {/* Learn */}
            <Link href="/app/learn" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#2C3777', borderRadius: 16, padding: '28px 24px 24px' }}>
              <p style={{ fontFamily: apfel, fontSize: 28, fontWeight: 500, color: '#F8F4EB', margin: '0 0 16px' }}>Learn</p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
                <svg width="160" height="148" viewBox="0 0 140 130" style={{ overflow: 'visible' }}>
                  <g transform="translate(61,51)"><path d={P1} {...p1Props}/></g>
                  <g transform="translate(93,53) rotate(-2)"><path d={P2} {...p2Props}/></g>
                  <g transform="translate(70,91)"><path d={P3} {...p3Props}/></g>
                </svg>
              </div>
              <div style={{ flex: 1, margin: '0 0 15px' }}>
                <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: '#FFFFFF', margin: '0 0 13px' }}>Understand your options</p>
                <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#F8F4EB', margin: 0 }}>Review key areas of planning and test your knowledge</p>
              </div>
              <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#F8F4EB', color: '#26215C', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 500, fontFamily: hv }}>Open →</span>
            </Link>

            {/* Plan */}
            <Link href="/app/plan" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#F29836', borderRadius: 16, padding: '28px 24px 24px' }}>
              <p style={{ fontFamily: apfel, fontSize: 28, fontWeight: 500, color: '#412402', margin: '0 0 16px' }}>Plan</p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
                <svg width="160" height="148" viewBox="0 0 140 130" style={{ overflow: 'visible' }}>
                  <g transform="translate(41,51)"><path d={P1} {...p1Props}/></g>
                  <g transform="translate(69,55)"><path d={P2} {...p2Props}/></g>
                  <g transform="translate(50,87)"><path d={P3} {...p3Props}/></g>
                  <line x1="71" y1="57" x2="101" y2="56" stroke="#130426" strokeWidth="1" strokeDasharray="3,2" opacity="0.7"/>
                  <line x1="71" y1="57" x2="101" y2="74" stroke="#130426" strokeWidth="1" strokeDasharray="3,2" opacity="0.7"/>
                  <circle cx="71" cy="57" r="3" fill="#130426"/>
                  <circle cx="101" cy="56" r="3" fill="#130426"/>
                  <circle cx="101" cy="74" r="3" fill="#130426"/>
                </svg>
              </div>
              <div style={{ flex: 1, margin: '0 0 15px' }}>
                <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: '#1A1A1A', margin: '0 0 13px' }}>Organize your plan</p>
                <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#1A1A1A', margin: 0 }}>Track your progress and create outputs to share</p>
              </div>
              <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#412402', color: '#F8F4EB', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 500, fontFamily: hv }}>Open →</span>
            </Link>

          </div>

          {/* Privacy line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="6.5" width="10" height="7" rx="1.5" stroke="#2A2A2A" strokeWidth="1.4"/>
              <path d="M4 6.5V4.5a3 3 0 0 1 6 0v2" stroke="#2A2A2A" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: hv, fontSize: 14, color: '#2A2A2A' }}>
              Private by default — everything stays yours until you decide to share it
            </span>
          </div>

        </div>
      </div>

      {/* ── "Your thinking, organized" section ── */}
      <section className="px-5 md:px-16" style={{ background: '#2C3777', paddingTop: 56, paddingBottom: 56, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          {/* Top half — two-column grid */}
          <div className="yto-top-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start', marginBottom: 52 }}>

            {/* Left — heading + subhead */}
            <div>
              <h2 style={{ fontFamily: apfel, fontSize: 32, fontWeight: 400, color: '#FFFFFF', margin: '0 0 20px 0', lineHeight: 1.15 }}>
                Your thinking, organized
              </h2>
              <p style={{ fontFamily: hv, fontSize: 19, fontWeight: 400, color: '#F8F4EB', lineHeight: 1.7, margin: 0 }}>
                End-of-life planning rarely happens all at once. It typically unfolds in scattered moments over time: a thought here, a conversation there, something you learned last week.
              </p>
              <p style={{ fontFamily: hv, fontSize: 19, fontWeight: 400, color: '#F8F4EB', lineHeight: 1.7, marginTop: 20, marginBottom: 0 }}>
                This platform is built to support that. It automatically saves your reflections, notes, and planning work as you go, organizing them in <Link href="/app/plan" target="_blank" rel="noopener noreferrer" style={{ color: '#F8F4EB', textDecoration: 'underline' }}>Your Plan</Link> and helping you shape them into structured outputs and documents to use or share.
              </p>
            </div>

            {/* Right — two stacked cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ background: 'transparent', border: '1px solid rgba(240,160,48,0.4)', borderRadius: 12, padding: '24px' }}>
                <p style={{ fontFamily: hv, fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px 0' }}>Captured automatically</p>
                <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.65, color: '#F8F4EB', margin: 0 }}>Notes, voice notes, and activity outputs are saved to Your Plan as you go, wherever they happen in the platform. Voice notes are transcribed automatically.</p>
              </div>

              <div style={{ background: 'transparent', border: '1px solid rgba(240,160,48,0.4)', borderRadius: 12, padding: '24px' }}>
                <p style={{ fontFamily: hv, fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px 0' }}>Surfaced intelligently</p>
                <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.65, color: '#F8F4EB', margin: 0 }}>Your Plan sorts everything into areas and gathers related materials in context — so when you&apos;re working through a topic, your relevant notes and outputs are already there.</p>
              </div>

            </div>
          </div>

          {/* Bottom — divider + area list */}
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.12)', margin: '0 0 28px' }} />
          <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f0a030', margin: '0 0 16px 0' }}>
            your plan, by area
          </p>
          <div className="yto-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {['Healthcare Wishes', 'Deathcare', 'Legacy', 'Wills & Estates', 'Personal Admin', 'Ritual & Ceremony'].map((area) => (
              <div key={area} style={{ fontFamily: hv, fontSize: 14, fontWeight: 400, color: '#F8F4EB', padding: '10px 14px', borderLeft: '1.5px solid rgba(240,160,48,0.5)' }}>
                {area}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── More than paperwork ── */}
      <div style={{ background: '#f8f4eb' }}>
        <div className="max-w-6xl mx-auto px-4" style={{ paddingTop: 72, paddingBottom: 72 }}>
          <div ref={headingRef} className="ns-title-wrap" style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: apfel, fontSize: 32, fontWeight: 400, color: '#130426', margin: 0, lineHeight: 1.15 }}>
              <span className="ns-title-underline">More than paperwork</span>
            </h2>
          </div>
          <div className="approach-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <p style={{ fontFamily: hv, fontSize: 19, color: '#130426', lineHeight: 1.7, marginTop: 0, marginBottom: 0 }}>
                End-of-life planning is often treated as just filling out forms, checking boxes, and getting it over with as fast as possible.
              </p>
              <p style={{ fontFamily: hv, fontSize: 19, color: '#130426', lineHeight: 1.7, marginTop: 20, marginBottom: 0 }}>
                <strong>This platform takes the opposite approach</strong>, inviting you to slow down and engage in a deeper process of reflection. It&apos;s designed to help you explore your values and clarify what&apos;s most important to you, create opportunities for meaningful conversations with loved ones about your wishes, document your plans with intention, and reduce fear and uncertainty by addressing the emotional as well as the practical.
              </p>
              <p style={{ fontFamily: hv, fontSize: 19, color: '#130426', lineHeight: 1.7, marginTop: 20, marginBottom: 0 }}>
                By leaning into curiosity and reflection, this process can bring clarity, comfort, and even a sense of peace — both for you, and the people who care about you.
              </p>
            </div>
            <div className="home-approach-aside" style={{ background: '#EEEDFE', borderRadius: 12, padding: '32px 36px', marginLeft: 24 }}>
              <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 700, color: '#26215C', margin: '0 0 10px' }}>
                Use on your own, or with others
              </p>
              <p style={{ fontFamily: hv, fontSize: 15, color: '#26215C', lineHeight: 1.7, margin: 0 }}>
                This platform is also designed for flexibility, so that any activity can be done alone or with others.<br/><br/>The included activities — reflection prompts, the scenario navigator, the trivia game, legacy conversations — can help you understand each other&apos;s values and fears, start important conversations, and deepen your connections with the people in your life.
              </p>
            </div>
          </div>
        </div>
      </div>

    </>
  )
}
