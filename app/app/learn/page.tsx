'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { LEARN_AREAS } from '@/lib/learn-areas'

const CARD_STYLES = [
  { bg: 'bg-[#BBABF4]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
  { bg: 'bg-[#f29836]', text: 'text-[#130426]', pill: 'bg-[#130426] text-[#f8f4eb]' },
  { bg: 'bg-[#f8f4eb]', text: 'text-[#130426]', pill: 'bg-[#2C3777] text-[#f8f4eb]' },
  { bg: 'bg-[#2C3777]', text: 'text-[#f8f4eb]', pill: 'bg-[#f8f4eb] text-[#130426]' },
  { bg: 'bg-[#DB5835]', text: 'text-[#ffffff]', pill: 'bg-[#f8f4eb] text-[#130426]' },
  { bg: 'bg-[#BBABF4]', text: 'text-[#130426]', pill: 'bg-[#2C3777] text-[#f8f4eb]' },
]

const apfel = "'ApfelGrotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const inner = { maxWidth: '1280px', marginLeft: 'auto' as const, marginRight: 'auto' as const, paddingLeft: '64px', paddingRight: '64px' }

export default function LearnPage() {
  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'learn_page_viewed', metadata: { page: 'home' } }),
    }).catch(() => {})
  }, [])

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
        .ln-trivia-panel {
          display: block;
          position: relative;
          background: #F8F4EB;
          border: 2px solid #130426;
          border-radius: 18px;
          box-shadow: 4px 4px 0 #130426;
          padding: 24px;
          text-decoration: none;
          transition: box-shadow 150ms ease, transform 150ms ease;
          max-width: 540px;
          width: 100%;
        }
        .ln-trivia-panel:hover {
          box-shadow: 2px 2px 0 #130426;
          transform: translate(2px, 2px);
        }
      `}</style>

      <div className="min-h-screen" style={{ background: '#BBABF4' }}>

        {/* ── HERO ── */}
        <div style={{ ...inner, paddingTop: '80px', paddingBottom: '32px' }}>
          <div style={{ maxWidth: '760px' }}>
            <div className="ln-animate">
              <h1 className="ns-title-section" style={{ fontSize: 64, fontWeight: 500, lineHeight: 1.08, color: '#130426', margin: 0 }}>
                <span className="ln-underline">Learn</span>
              </h1>
            </div>
            <p style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.55, color: 'rgba(19,4,38,0.78)', marginTop: 20, marginBottom: 0, maxWidth: 760 }}>
              Build the knowledge you need to make informed, practical decisions.
            </p>
          </div>
        </div>

        {/* ── EDITORIAL INTRO ── */}
        <div style={{ ...inner, paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ maxWidth: '760px' }}>
            <div className="ln-animate">
              <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginTop: 0, marginBottom: '20px' }}>
                Planning for the end of life can feel overwhelming, especially when navigating complex healthcare systems, legal requirements, and unfamiliar terminology.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginTop: 0, marginBottom: '8px' }}>
                You might have questions like:
              </p>
              <div style={{ paddingLeft: 20, marginBottom: '20px' }}>
                <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginTop: 0, marginBottom: '2px' }}>What makes a will valid?</p>
                <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginTop: 0, marginBottom: '2px' }}>What are the rules for organ donation?</p>
                <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginTop: 0, marginBottom: 0 }}>What burial or cremation options are available in my province?</p>
              </div>
              <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginTop: 0, marginBottom: '20px' }}>
                Some of the most important details in end-of-life planning depend on where you live, and learning about your options helps ensure your plans are practical, legally sound, and aligned with your values. This section helps make those questions more manageable by combining a general overview with tools that point you to province-specific guidance. The resources linked throughout this section are designed to complement the platform by helping you find relevant templates, forms, and explanations for decisions about advance directives, decision-makers, wills, powers of attorney, and more.
              </p>
              <p style={{ fontFamily: hv, fontSize: '18px', fontWeight: 400, lineHeight: '1.75', color: '#130426', marginTop: 0, marginBottom: 0 }}>
                Learning about your options can also help reduce barriers to equitable care. It can support you in understanding your rights, preparing practical documents, and identifying approaches that reflect your cultural, personal, or community needs.
              </p>
            </div>
          </div>
        </div>

        {/* ── DEATHCARE TRIVIA PANEL ── */}
        <div style={{ ...inner, marginTop: '48px' }}>
          <Link href="/app/learn/trivia" className="ln-trivia-panel">
            <span style={{
              position: 'absolute',
              top: '18px',
              right: '20px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#F29836',
              color: '#130426',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: apfel,
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: '1',
              flexShrink: 0,
            }}>?</span>
            <div style={{ fontFamily: apfel, fontSize: '22px', fontWeight: 600, color: '#130426', marginBottom: '6px', paddingRight: '48px' }}>
              Deathcare Trivia
            </div>
            <div style={{ fontFamily: hv, fontSize: '15px', lineHeight: '1.5', color: 'rgba(19,4,38,0.70)' }}>
              A fun way to test what you know and discover what you don&apos;t.
            </div>
            <span style={{ display: 'inline-block', background: '#F29836', color: '#130426', fontFamily: hv, fontSize: '15px', fontWeight: 600, padding: '10px 20px', borderRadius: '999px', marginTop: '18px' }}>
              Play →
            </span>
          </Link>
        </div>

        {/* ── AREAS OF PLANNING ── */}
        <div style={{ ...inner, marginTop: '56px', paddingBottom: '96px' }}>
          <div style={{ background: 'rgba(248, 244, 235, 0.28)', border: '1px solid rgba(19, 4, 38, 0.08)', borderRadius: '24px', padding: '48px' }}>
          <h2 style={{ fontFamily: apfel, fontSize: '32px', fontWeight: 600, lineHeight: '1.1', color: '#130426', margin: 0 }}>
            Areas of planning
          </h2>
          <p style={{ fontFamily: hv, fontSize: '18px', lineHeight: '1.6', color: 'rgba(19,4,38,0.75)', marginTop: '12px', marginBottom: 0 }}>
            Explore key areas of end-of-life planning and understand your options.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8" style={{ marginTop: '32px' }}>
            {LEARN_AREAS.map((area, i) => {
              if (area.id === 'healthcare') {
                return (
                  <Link key={area.id} href={`/app/learn/${area.id}`} className="block rounded-2xl px-8 py-8 transition hover:opacity-90" style={{ background: '#130426' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#FFFFFF' }}>{area.title}</div>
                    <div style={{ fontSize: '1rem', lineHeight: '1.625', marginBottom: '1.5rem', color: 'rgba(255,255,255,0.85)' }}>{area.description}</div>
                    <span style={{ display: 'inline-block', fontSize: '0.875rem', fontWeight: 600, borderRadius: '999px', padding: '0.5rem 1.25rem', background: '#FFFFFF', color: '#130426' }}>Explore →</span>
                  </Link>
                )
              }
              if (area.id === 'ritual') {
                return (
                  <Link key={area.id} href={`/app/learn/${area.id}`} className="block rounded-2xl px-8 py-8 transition hover:opacity-90" style={{ background: '#F8F4EB' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1A1A1A' }}>{area.title}</div>
                    <div style={{ fontSize: '1rem', lineHeight: '1.625', marginBottom: '1.5rem', color: 'rgba(0,0,0,0.75)' }}>{area.description}</div>
                    <span style={{ display: 'inline-block', fontSize: '0.875rem', fontWeight: 600, borderRadius: '999px', padding: '0.5rem 1.25rem', background: '#130426', color: '#FFFFFF' }}>Explore →</span>
                  </Link>
                )
              }
              const style = CARD_STYLES[i % CARD_STYLES.length]
              return (
                <Link
                  key={area.id}
                  href={`/app/learn/${area.id}`}
                  className={`block rounded-2xl px-8 py-8 transition hover:opacity-90 ${style.bg}`}
                >
                  <div className={`text-2xl font-bold mb-3 ${style.text}`}>
                    {area.title}
                  </div>
                  <div className={`text-base leading-relaxed mb-6 ${style.text}`}>
                    {area.description}
                  </div>
                  <span className={`inline-block text-sm font-semibold rounded-full px-5 py-2 ${style.pill}`}>
                    Explore →
                  </span>
                </Link>
              )
            })}
          </div>
          </div>
        </div>

      </div>
    </>
  )
}
