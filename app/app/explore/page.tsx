'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type ExploreActivityCardProps = {
  title: string
  description: string
  href?: string
  status?: 'available' | 'coming_soon'
  index: number
  cta?: string
}

type CardConfig = {
  bg: string
  border: string
  titleColor: string
  bodyColor: string
  ctaBg: string
  ctaColor: string
}

const CARD_CONFIGS: CardConfig[] = [
  {
    bg: '#BBABF4',
    border: '2px solid rgba(19,4,38,0.14)',
    titleColor: '#130426',
    bodyColor: 'rgba(19,4,38,0.78)',
    ctaBg: '#130426',
    ctaColor: '#FFFFFF',
  },
  {
    bg: '#1B1744',
    border: '2px solid rgba(255,255,255,0.18)',
    titleColor: '#FFFFFF',
    bodyColor: 'rgba(255,255,255,0.82)',
    ctaBg: '#F8F4EB',
    ctaColor: '#130426',
  },
  {
    bg: '#DB5835',
    border: '2px solid rgba(255,255,255,0.18)',
    titleColor: '#FFFFFF',
    bodyColor: 'rgba(255,255,255,0.82)',
    ctaBg: '#F8F4EB',
    ctaColor: '#130426',
  },
  {
    bg: '#F8F4EB',
    border: '2px solid rgba(19,4,38,0.14)',
    titleColor: '#130426',
    bodyColor: 'rgba(19,4,38,0.78)',
    ctaBg: '#130426',
    ctaColor: '#FFFFFF',
  },
]

export default function ExplorePage() {
  useEffect(() => {
    const elements = document.querySelectorAll('.ns-title-wrap')
    if (!elements.length) return
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
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        .ns-title-wrap {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 350ms ease-out, transform 350ms ease-out;
        }
        .ns-title-wrap.ns-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ns-title-underline {
          position: relative;
          display: inline;
        }
        .ns-title-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 4px;
          background: #F29836;
          border-radius: 999px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms ease-out 100ms;
        }
        .ns-title-wrap.ns-visible .ns-title-underline::after {
          transform: scaleX(1);
        }
        .explore-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 56px;
        }
        @media (max-width: 640px) {
          .explore-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#2C3777' }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 80,
          paddingBottom: 72,
        }}>

          <div className="ns-title-wrap">
            <h1 className="ns-title-section" style={{
              fontSize: 64,
              fontWeight: 500,
              lineHeight: 1.08,
              color: '#FFFFFF',
              margin: 0,
            }}>
              <span className="ns-title-underline">Reflect</span>
            </h1>
          </div>

          <p style={{
            fontSize: 20,
            fontWeight: 400,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.94)',
            maxWidth: 760,
            marginTop: 20,
            marginBottom: 0,
          }}>
            Work through guided activities that help you test ideas, clarify your
            priorities, and create material you can return to later.
          </p>

          <div style={{ maxWidth: 760, marginTop: 32, marginBottom: 0 }}>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', marginTop: 0, marginBottom: 20 }}>
              Before rushing into tasks like completing an advance directive, it's helpful to pause. Taking the time to think deeply about your values, feelings, and relationship to death will help ensure your plans are grounded in what matters most to you.
            </p>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', marginTop: 0, marginBottom: 20 }}>
              Activities in this section are designed to help you imagine what a "good death" looks like for you, clarify how your values translate into real choices, and consider what you want to leave behind.
            </p>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', marginTop: 0, marginBottom: 20 }}>
              Capture notes along the way using the activity noteboxes or the notepad tool — <span style={{ fontWeight: 600 }}>the notes and outputs you create here are saved as materials and will be surfaced when you're working in your Plan.</span>
            </p>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', marginTop: 0, marginBottom: 0 }}>
              Start anywhere, and move at your own pace.
            </p>
          </div>

          <div className="explore-grid">
            <ExploreActivityCard
              title="Reflection Prompts"
              description="Use guided prompts to reflect on your values, wishes, relationships, and what matters most."
              href="/app/reflect"
              status="available"
              index={0}
              cta="Open →"
            />
            <ExploreActivityCard
              title="Values & Fears Ranking"
              description="Prioritize what matters most to you, using a guided card sort activity."
              href="/app/explore/values-and-fears"
              status="available"
              index={1}
            />
            <ExploreActivityCard
              title="Scenario Navigator"
              description="Work through realistic situations to see how your values and preferences might apply in practice."
              href="/app/explore/scenario-navigator"
              status="available"
              index={2}
            />
            <ExploreActivityCard
              title="Legacy Map"
              description="Explore what you want to pass on, document, or make visible to others after your death."
              href="/app/explore/legacy-map"
              status="available"
              index={3}
            />
          </div>

        </div>
      </div>
    </>
  )
}

function ExploreActivityCard({
  title,
  description,
  href,
  status = 'available',
  index,
  cta,
}: ExploreActivityCardProps) {
  const config = CARD_CONFIGS[index % CARD_CONFIGS.length]
  const isAvailable = status === 'available' && !!href
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const cardStyle: React.CSSProperties = {
    minHeight: 280,
    padding: 32,
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: config.bg,
    border: config.border,
    boxShadow: hovered && !pressed
      ? '8px 8px 0 rgba(19,4,38,0.24)'
      : '6px 6px 0 rgba(19,4,38,0.18)',
    transform: hovered && !pressed ? 'translateY(-3px)' : 'translateY(0)',
    transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
    opacity: isAvailable ? 1 : 0.5,
    boxSizing: 'border-box',
    cursor: isAvailable ? 'pointer' : 'default',
  }

  const inner = (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.25, color: config.titleColor, margin: 0 }}>
          {title}
        </h2>
        <p style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.55, color: config.bodyColor, marginTop: 12, marginBottom: 0 }}>
          {description}
        </p>
      </div>
      <div>
        <span style={{
          height: 48,
          paddingLeft: 24,
          paddingRight: 24,
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: config.ctaBg,
          color: config.ctaColor,
          border: 'none',
          textDecoration: 'none',
        }}>
          {isAvailable ? (cta ?? 'Begin →') : 'Coming soon'}
        </span>
      </div>
    </div>
  )

  if (!isAvailable) return inner

  return (
    <Link href={href!} style={{ display: 'block', textDecoration: 'none' }}>
      {inner}
    </Link>
  )
}
