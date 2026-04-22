'use client'

import Link from 'next/link'
import { useEffect } from 'react'

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const inner = { maxWidth: '760px' }

export default function LearnPage() {
  useEffect(() => {
    const elements = document.querySelectorAll('.ln-animate')
    if (!elements.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ln-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        .ln-animate {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 350ms ease-out, transform 350ms ease-out;
        }
        .ln-animate.ln-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ln-underline {
          position: relative;
          display: inline;
        }
        .ln-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 4px;
          background: #DB5835;
          border-radius: 999px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms ease-out 100ms;
        }
        .ln-animate.ln-visible .ln-underline::after {
          transform: scaleX(1);
        }
      `}</style>

      <div className="min-h-screen" style={{ background: '#F29836' }}>

        {/* ── HERO ── */}
        <div style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '64px', paddingRight: '64px', paddingTop: '88px', paddingBottom: '32px' }}>
          <div style={inner}>
            <div className="ln-animate">
              <h1 className="ns-title-section" style={{ color: '#FFFFFF' }}>
                <span className="ln-underline">Learn</span>
              </h1>
            </div>
            <p className="ns-lead-section"
              style={{ color: '#FFFFFF', marginTop: '20px', maxWidth: '620px' }}
            >
              Build the knowledge you need to make informed, practical decisions.
            </p>
          </div>
        </div>

        {/* ── EDITORIAL INTRO ── */}
        <div style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '64px', paddingRight: '64px', paddingTop: 0, paddingBottom: '56px' }}>
          <div style={inner}>

            <div className="ln-animate">
              <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#FFFFFF', marginTop: 0, marginBottom: '20px', maxWidth: '760px' }}>
                Planning for the end of life can feel overwhelming, especially when navigating complex healthcare systems, legal requirements, and unfamiliar terminology. Learning about your options helps ensure your plans are practical, legally sound, and aligned with your values.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#FFFFFF', marginTop: 0, marginBottom: '20px', maxWidth: '760px' }}>
                Some of the most important details in end-of-life planning depend on where you live. What makes a will valid? What are the rules for organ donation? What burial or cremation options are available in your province? This section helps make those questions more manageable by combining a general overview with tools that point you to province-specific guidance.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#FFFFFF', marginTop: 0, marginBottom: '20px', maxWidth: '760px' }}>
                The resources linked throughout this section are designed to complement the platform by helping you find relevant templates, forms, and explanations for decisions about advance directives, decision-makers, wills, powers of attorney, and more.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#FFFFFF', marginTop: 0, marginBottom: 0, maxWidth: '760px' }}>
                Learning about your options can also help reduce barriers to equitable care. It can support you in understanding your rights, preparing practical documents, and identifying approaches that reflect your cultural, personal, or community needs.
              </p>
            </div>

            {/* What you'll do */}
            <div className="ln-animate" style={{ marginTop: '28px' }}>
              <p style={{ fontFamily: hv, fontSize: '16px', fontWeight: 600, lineHeight: '1.4', color: '#FFFFFF', marginTop: 0, marginBottom: '12px' }}>
                What you&apos;ll do in this section
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Get an overview of key areas of end-of-life planning.',
                  'Test your knowledge with Deathcare Trivia.',
                  'Explore province-specific resources, templates, and guidance for tools like advance directives, decision-makers, wills, and powers of attorney.',
                  'Use what you learn here to support later reflection, exploration, and documentation.',
                ].map((line) => (
                  <p key={line} style={{ fontFamily: hv, fontSize: '16px', fontWeight: 400, lineHeight: '1.6', color: '#FFFFFF', margin: 0 }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>


          </div>
        </div>

        {/* ── ACTIVITY CARDS ── */}
        <div style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '64px', paddingRight: '64px', paddingBottom: '96px', marginTop: '48px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Deathcare Trivia */}
            <Link
              href="/app/learn/trivia"
              className="block rounded-2xl bg-[#130426] px-10 py-10 transition hover:opacity-90"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-white mb-6 opacity-50">
                Interactive
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
                Deathcare Trivia
              </h2>
              <p className="text-base text-white leading-relaxed mb-10">
                A game-based way to learn. Test what you know, discover what you don't.
              </p>
              <span className="inline-block rounded-full bg-[#f29836] text-[#130426] px-5 py-2 text-sm font-semibold">
                Play →
              </span>
            </Link>

            {/* Explore areas of planning */}
            <Link
              href="/app/learn/areas"
              className="block rounded-2xl bg-[#2C3777] px-10 py-10 transition hover:opacity-90"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-white mb-6 opacity-70">
                Exploratory
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
                Explore areas of planning
              </h2>
              <p className="text-base text-white leading-relaxed mb-10">
                Read about healthcare, wills, deathcare, legacy, and more — at your own pace.
              </p>
              <span className="inline-block rounded-full bg-[#f8f4eb] text-[#130426] px-5 py-2 text-sm font-semibold">
                Browse →
              </span>
            </Link>

          </div>
        </div>

      </div>
    </>
  )
}
