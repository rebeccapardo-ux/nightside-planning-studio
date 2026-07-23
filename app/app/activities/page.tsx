'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ActivityIcon from '@/app/components/ActivityIcon'
import LandingContainer from '@/app/components/LandingContainer'

type ExploreActivityCardProps = {
  title: string
  description: string
  href?: string
  status?: 'available' | 'coming_soon'
  index: number
  iconSlug: string // item-level activity identity icon (see ActivityIcon)
}

type CardConfig = {
  bg: string
  border: string
  titleColor: string
  bodyColor: string
  ctaBg: string
  ctaColor: string
}

// All activity cards share one Night treatment (Activities section identity moved from Sunrise
// to Night — the sunrise banners read too hot; night is calmer and its cream ink passes contrast
// cleanly). Cream CTA pill + cream ink on the night fill; the sunrise identity now lives only on
// the homepage nav + the decorative puzzle motif.
const NIGHT_CONFIG: CardConfig = {
  bg: '#2C3777',
  border: '2px solid #000000',
  titleColor: '#F8F4EB',
  bodyColor: 'rgba(248,244,235,0.85)',
  ctaBg: '#F8F4EB',
  ctaColor: '#130426',
}

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

      <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
        <LandingContainer>

          <div className="ns-title-wrap">
            <h1 className="ns-title-section" style={{
              fontSize: 64,
              fontWeight: 500,
              lineHeight: 1.08,
              color: '#130426',
              margin: 0,
            }}>
              <span className="ns-title-underline">Activities</span>
            </h1>
          </div>

          <p style={{
            fontSize: 22,
            fontWeight: 500,
            lineHeight: 1.55,
            color: 'rgba(19,4,38,0.9)',
            maxWidth: 760,
            marginTop: 20,
            marginBottom: 0,
          }}>
            Work through guided activities that help you test ideas, clarify your
            priorities, and create material you can return to later.
          </p>

          <div style={{ maxWidth: 760, marginTop: 32, marginBottom: 0 }}>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.75, color: 'rgba(19,4,38,0.78)', marginTop: 0, marginBottom: 20 }}>
              Before rushing into tasks like completing an advance directive, it&rsquo;s helpful to pause. Taking the time to think deeply about your values, feelings, and relationship to death will help ensure your plans are grounded in what matters most to you.
            </p>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.75, color: 'rgba(19,4,38,0.78)', marginTop: 0, marginBottom: 20 }}>
              Activities in this section are designed to help you imagine what a good death looks like for you, clarify how your values translate into real choices, and consider what you want to leave behind.
            </p>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.75, color: 'rgba(19,4,38,0.78)', marginTop: 0, marginBottom: 20 }}>
              Capture notes along the way using the activity noteboxes or the notepad tool — <span style={{ fontWeight: 600 }}>the notes and outputs you create here are saved automatically and will be surfaced when you&rsquo;re working in Your materials.</span>
            </p>
            <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.75, color: 'rgba(19,4,38,0.78)', marginTop: 0, marginBottom: 0 }}>
              Start anywhere, and move at your own pace.
            </p>
          </div>

          <div className="explore-grid">
            <ExploreActivityCard
              title="Reflection Prompts"
              description="Use guided prompts to reflect on your experiences, beliefs, and what a good death means to you."
              href="/app/activities/reflection-prompts"
              status="available"
              index={0}
              iconSlug="reflection_prompts"
            />
            <ExploreActivityCard
              title="Values & Fears Ranking"
              description="Clarify what matters most at the end of life."
              href="/app/activities/values-and-fears"
              status="available"
              index={1}
              iconSlug="values_ranking"
            />
            <ExploreActivityCard
              title="Scenario Navigator"
              description="Work through realistic illness scenarios to see how your values and preferences might apply in practice."
              href="/app/activities/scenario-navigator"
              status="available"
              index={2}
              iconSlug="scenario_navigator"
            />
            <ExploreActivityCard
              title="Legacy Map"
              description="Explore meaningful moments in your life, and consider what you want to leave behind."
              href="/app/activities/legacy-map"
              status="available"
              index={3}
              iconSlug="legacy_map"
            />
            <ExploreActivityCard
              title="Deathcare Trivia"
              description="Play a game to test and build your knowledge of options for dying, death, and what happens to your body."
              href="/app/activities/trivia"
              status="available"
              index={4}
              iconSlug="deathcare_trivia"
            />
          </div>

        </LandingContainer>
      </div>
    </>
  )
}

function ExploreActivityCard({
  title,
  description,
  href,
  status = 'available',
  iconSlug,
}: ExploreActivityCardProps) {
  const config = NIGHT_CONFIG
  const isAvailable = status === 'available' && !!href
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const cardStyle: React.CSSProperties = {
    minHeight: 220,
    padding: 32,
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: config.bg,
    border: config.border,
    boxShadow: hovered && !pressed
      ? '8px 8px 0 rgba(0,0,0,0.88)'
      : '6px 6px 0 rgba(0,0,0,0.75)',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.25, color: config.titleColor, margin: 0 }}>
            {title}
          </h2>
          {/* Item-level activity identity icon — top-right, optically on the title. */}
          <ActivityIcon slug={iconSlug} size={31} color="#F8F4EB" />
        </div>
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
          {isAvailable ? 'Open →' : 'Coming soon'}
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
