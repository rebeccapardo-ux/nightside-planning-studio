'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'ApfelGrotezk', sans-serif"

// Piece paths in local coordinates (origin = piece center)
const P1 = "M -23,-26 H 15 V -4 H 23 V 4 H 15 V 26 H -4 V 18 H -12 V 26 H -23 Z"
const P2 = "M -13,-30 H 13 V 22 H 4 V 30 H -4 V 22 H -13 V 0 H -5 V -8 H -13 Z"
const P3 = "M -32,-10 H -21 V -18 H -13 V -10 H 15 V -2 H 23 V -10 H 32 V 18 H -32 Z"

// Standardized fills + stroke applied identically across all cards
const p1Props = { fill: '#BBABF4', stroke: '#130426', strokeWidth: '1.5' }
const p2Props = { fill: '#F29836', stroke: '#130426', strokeWidth: '1.5' }
const p3Props = { fill: '#F8F4EB', stroke: '#130426', strokeWidth: '1.5' }

export default function AppHomePage() {
  const [aboutOpen, setAboutOpen] = useState(false)
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
    <div className="min-h-screen bg-[#f8f4eb]">
      <div className="max-w-6xl mx-auto px-4 py-16">

        <div className="mb-12">
          <h1 className="text-h1 text-[#130426] mb-4">
            Welcome to your Planning Studio
          </h1>
          <p className="text-body text-[#130426] max-w-2xl">
            A space to reflect, learn, and plan. Start anywhere, and go at your own pace.
          </p>
        </div>

        {/* Unified three-card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'stretch' }}>

          {/* ── Reflect ── */}
          <Link
            href="/app/explore"
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#BBABF4', borderRadius: 16, padding: '28px 24px 24px' }}
          >
            <p style={{ fontFamily: apfel, fontSize: 28, fontWeight: 500, color: '#000000', margin: '0 0 16px' }}>Reflect</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
              <svg width="160" height="148" viewBox="0 0 140 130" style={{ overflow: 'visible' }}>
                <g transform="translate(52,42)">
                  <path d={P1} {...p1Props}/>
                </g>
                <g transform="translate(98,42)">
                  <path d={P2} {...p2Props}/>
                </g>
                <g transform="translate(75,98)">
                  <path d={P3} {...p3Props}/>
                </g>
              </svg>
            </div>
            <div style={{ flex: 1, margin: '0 0 15px' }}>
              <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: '#000000', margin: '0 0 13px' }}>
                Surface your values
              </p>
              <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#000000', margin: 0 }}>
                Explore scenarios and clarify what matters most
              </p>
            </div>
            <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#26215C', color: '#F8F4EB', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 500, fontFamily: hv }}>
              Open →
            </span>
          </Link>

          {/* ── Learn ── */}
          <Link
            href="/app/learn"
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#2C3777', borderRadius: 16, padding: '28px 24px 24px' }}
          >
            <p style={{ fontFamily: apfel, fontSize: 28, fontWeight: 500, color: '#F8F4EB', margin: '0 0 16px' }}>Learn</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
              <svg width="160" height="148" viewBox="0 0 140 130" style={{ overflow: 'visible' }}>
                <g transform="translate(61,51)">
                  <path d={P1} {...p1Props}/>
                </g>
                <g transform="translate(93,53) rotate(-2)">
                  <path d={P2} {...p2Props}/>
                </g>
                <g transform="translate(70,91)">
                  <path d={P3} {...p3Props}/>
                </g>
              </svg>
            </div>
            <div style={{ flex: 1, margin: '0 0 15px' }}>
              <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: '#FFFFFF', margin: '0 0 13px' }}>
                Understand your options
              </p>
              <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#F8F4EB', margin: 0 }}>
                Review key areas of planning and test your knowledge
              </p>
            </div>
            <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#F8F4EB', color: '#26215C', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 500, fontFamily: hv }}>
              Open →
            </span>
          </Link>

          {/* ── Plan ── */}
          <Link
            href="/app/materials"
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#F29836', borderRadius: 16, padding: '28px 24px 24px' }}
          >
            <p style={{ fontFamily: apfel, fontSize: 28, fontWeight: 500, color: '#412402', margin: '0 0 16px' }}>Plan</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
              <svg width="160" height="148" viewBox="0 0 140 130" style={{ overflow: 'visible' }}>
                <g transform="translate(41,51)">
                  <path d={P1} {...p1Props}/>
                </g>
                <g transform="translate(69,55)">
                  <path d={P2} {...p2Props}/>
                </g>
                <g transform="translate(50,87)">
                  <path d={P3} {...p3Props}/>
                </g>
                {/* Connected nodes: left circle flush to puzzle edge → top-right + bottom-right */}
                <line x1="71" y1="57" x2="101" y2="56" stroke="#130426" strokeWidth="1" strokeDasharray="3,2" opacity="0.7"/>
                <line x1="71" y1="57" x2="101" y2="74" stroke="#130426" strokeWidth="1" strokeDasharray="3,2" opacity="0.7"/>
                <circle cx="71"  cy="57" r="3" fill="#130426"/>
                <circle cx="101" cy="56" r="3" fill="#130426"/>
                <circle cx="101" cy="74" r="3" fill="#130426"/>
              </svg>
            </div>
            <div style={{ flex: 1, margin: '0 0 15px' }}>
              <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: '#1A1A1A', margin: '0 0 13px' }}>
                Organize your plan
              </p>
              <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: '#1A1A1A', margin: 0 }}>
                Track your progress and create outputs to share
              </p>
            </div>
            <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#412402', color: '#F8F4EB', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 500, fontFamily: hv }}>
              Open →
            </span>
          </Link>

        </div>

        {/* Privacy line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="6.5" width="10" height="7" rx="1.5" stroke="#5F5E5A" strokeWidth="1.2"/>
            <path d="M4 6.5V4.5a3 3 0 0 1 6 0v2" stroke="#5F5E5A" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: hv, fontSize: 14, color: '#5F5E5A' }}>
            Private by default — everything stays yours until you decide to share it
          </span>
        </div>

        {/* ── "A different approach" section ── */}
        <style>{`
          .ns-title-wrap { opacity: 0; transform: translateY(12px); transition: opacity 350ms ease-out, transform 350ms ease-out; display: inline-block; }
          .ns-title-wrap.ns-visible { opacity: 1; transform: translateY(0); }
          .ns-title-underline { position: relative; display: inline; }
          .ns-title-underline::after { content: ''; position: absolute; left: 0; bottom: -5px; width: 100%; height: 4px; background: #F29836; border-radius: 999px; transform: scaleX(0); transform-origin: left; transition: transform 350ms ease-out 100ms; }
          .ns-title-wrap.ns-visible .ns-title-underline::after { transform: scaleX(1); }
          .about-link { color: #DB5835; text-decoration: none; }
          .about-link:hover { text-decoration: underline; }
          @media (max-width: 768px) { .approach-grid { grid-template-columns: 1fr !important; } }
        `}</style>
        <section style={{ paddingTop: 64, paddingBottom: 64 }}>

          <div ref={headingRef} className="ns-title-wrap" style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: hv, fontSize: 32, fontWeight: 500, color: '#130426', margin: 0, lineHeight: 1.15 }}>
              <span className="ns-title-underline">More than paperwork</span>
            </h2>
          </div>

          <div className="approach-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'start' }}>

            {/* Left column — body paragraphs */}
            <div>
              <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.7, marginTop: 0, marginBottom: 0 }}>
                End-of-life planning is often treated as just filling out forms, checking boxes, and getting it over with as fast as possible.
              </p>
              <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.7, marginTop: 20, marginBottom: 0 }}>
                This platform takes the opposite approach, inviting you to slow down and engage in a deeper process of reflection. It's designed to help you explore your values and clarify what's most important to you, create opportunities for meaningful conversations with loved ones about your wishes, document your plans with intention, and reduce fear and uncertainty by addressing the emotional as well as the practical.
              </p>
              <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.7, marginTop: 20, marginBottom: 0 }}>
                By leaning into curiosity and reflection, this process can bring clarity, comfort, and even a sense of peace — both for you, and the people who care about you.
              </p>
            </div>

            {/* Right column — callout */}
            <div style={{ background: '#EEEDFE', borderRadius: 12, padding: '24px 28px' }}>
              <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 500, color: '#26215C', margin: '0 0 10px' }}>
                Use on your own, or with others
              </p>
              <p style={{ fontFamily: hv, fontSize: 16, color: '#26215C', lineHeight: 1.7, margin: 0 }}>
                This platform is also designed for flexibility, so that any activity can be done alone or with others. The included activities — reflection prompts, the scenario navigator, the trivia game, legacy conversations — are powerful ways to understand each other's values and fears, start important conversations, and deepen your connections with the people in your life.
              </p>
            </div>

          </div>

          {/* About Rebecca */}
          <p style={{ fontFamily: hv, fontSize: 15, color: '#5F5E5A', textAlign: 'center', marginTop: 40, marginBottom: 0 }}>
            Built by Rebecca Pardo, PhD — anthropologist, designer, and death doula.{' '}
            <button onClick={() => setAboutOpen(true)} className="about-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: hv, fontSize: 15 }}>Read more →</button>
          </p>

        </section>

      </div>
    </div>

    {/* ── About Rebecca modal ── */}
    {aboutOpen && (
      <div
        onClick={() => setAboutOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(19,4,38,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ background: '#F8F4EB', borderRadius: 16, padding: '40px 48px', maxWidth: 600, width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative', animation: 'modal-in 0.25s ease' }}
        >
          <style>{`
            @keyframes modal-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            .modal-close:hover { color: #130426 !important; }
            .nightside-link { color: #DB5835; text-decoration: none; }
            .nightside-link:hover { text-decoration: underline; }
          `}</style>

          {/* Close button */}
          <button
            onClick={() => setAboutOpen(false)}
            className="modal-close"
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', padding: 8, cursor: 'pointer', fontSize: 20, color: '#5F5E5A', lineHeight: 1 }}
            aria-label="Close"
          >×</button>

          {/* Heading */}
          <p style={{ fontFamily: hv, fontSize: 24, fontWeight: 500, color: '#130426', margin: '0 0 24px' }}>About Rebecca</p>

          {/* Photo + credentials row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <img
              src="/rebecca-pardo.png"
              alt="Rebecca Pardo"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <p style={{ fontFamily: hv, fontSize: 14, color: '#5F5E5A', margin: 0, lineHeight: 1.5 }}>
              Rebecca Pardo, PhD<br/>
              Anthropologist · Designer · Death Doula<br/>
              Founder, <a href="https://thenightside.net/" target="_blank" rel="noopener noreferrer" className="nightside-link">The Nightside</a>
            </p>
          </div>

          {/* Body */}
          <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: '0 0 16px' }}>
            I'm Rebecca Pardo — an anthropologist, technologist, and death doula. For over 15 years I've worked in research, design, and technology, exploring how technology shapes human behavior. My focus shifted when I began working in end-of-life spaces, bringing my expertise in design and interaction to help create more supportive and compassionate experiences around dying, death, and grief.
          </p>
          <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: '0 0 16px' }}>
            My perspective changed dramatically when I joined Facebook's Memorialization team, studying what happens when account holders die. Through international ethnographic research — observing and participating in death rituals in Indonesia, India, and Mexico — I saw firsthand how deeply personal and complex death planning is. I also saw how avoidance and a lack of planning leave families in distress, with unanswered questions and uncertainty.
          </p>
          <p style={{ fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: 0 }}>
            And then, my dog Quincy got sick. Suddenly, what I had been researching became deeply personal. Drawing on my research and leaning into rituals, I transformed what could have been a devastating experience into one of peace, meaning, and love. It changed how I approached death and life forever. This platform is the culmination of that journey — designed to empower you to make informed, compassionate choices, not just for yourself but for the people you care about most.
          </p>

          {/* Credentials footer */}
          <div style={{ borderTop: '0.5px solid #D3D1C7', marginTop: 24, paddingTop: 16 }}>
            <p style={{ fontFamily: hv, fontSize: 13, color: '#5F5E5A', margin: 0 }}>
              Rebecca Pardo, PhD<br/>Anthropologist · Designer · Death Doula<br/>Founder,{' '}
              <a href="https://thenightside.net/" target="_blank" rel="noopener noreferrer" className="nightside-link">The Nightside</a>
            </p>
          </div>

        </div>
      </div>
    )}
    </>
  )
}
