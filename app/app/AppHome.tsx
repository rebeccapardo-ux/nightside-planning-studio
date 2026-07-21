'use client'

import Link from 'next/link'
import HomeOnboardingIndicator from '@/app/components/HomeOnboardingIndicator'
import LandingContainer from '@/app/components/LandingContainer'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Puzzle-piece geometry, reused from the previous landing cards (origin = piece center).
const P1 = 'M -23,-26 H 15 V -4 H 23 V 4 H 15 V 26 H -4 V 18 H -12 V 26 H -23 Z'
const P2 = 'M -13,-30 H 13 V 22 H 4 V 30 H -4 V 22 H -13 V 0 H -5 V -8 H -13 Z'
const P3 = 'M -32,-10 H -21 V -18 H -13 V -10 H 15 V -2 H 23 V -10 H 32 V 18 H -32 Z'
const p1Props = { fill: '#BBABF4', stroke: '#130426', strokeWidth: '1.5' }
const p2Props = { fill: '#F29836', stroke: '#130426', strokeWidth: '1.5' }
const p3Props = { fill: '#F8F4EB', stroke: '#130426', strokeWidth: '1.5' }

// The three real puzzle graphics, in their progression: separated (Activities) →
// relating (Plan by area) → interlocked + export (Your materials).
function ActivitiesPuzzle({ size = 98 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 91 / 98)} viewBox="0 0 140 130" style={{ flexShrink: 0, overflow: 'visible' }} aria-hidden="true">
      <g transform="translate(52,42)"><path d={P1} {...p1Props} /></g>
      <g transform="translate(98,42)"><path d={P2} {...p2Props} /></g>
      <g transform="translate(75,98)"><path d={P3} {...p3Props} /></g>
    </svg>
  )
}
function PlanPuzzle() {
  return (
    <svg width="98" height="91" viewBox="0 0 140 130" style={{ flexShrink: 0, overflow: 'visible' }} aria-hidden="true">
      <g transform="translate(61,51)"><path d={P1} {...p1Props} /></g>
      <g transform="translate(93,53) rotate(-2)"><path d={P2} {...p2Props} /></g>
      <g transform="translate(70,91)"><path d={P3} {...p3Props} /></g>
    </svg>
  )
}
function MaterialsPuzzle({ size = 98 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 91 / 98)} viewBox="0 0 140 130" style={{ flexShrink: 0, overflow: 'visible' }} aria-hidden="true">
      <g transform="translate(41,51)"><path d={P1} {...p1Props} /></g>
      <g transform="translate(69,55)"><path d={P2} {...p2Props} /></g>
      <g transform="translate(50,87)"><path d={P3} {...p3Props} /></g>
      <line x1="71" y1="57" x2="101" y2="56" stroke="#130426" strokeWidth="1" strokeDasharray="3,2" opacity="0.7" />
      <line x1="71" y1="57" x2="101" y2="74" stroke="#130426" strokeWidth="1" strokeDasharray="3,2" opacity="0.7" />
      <circle cx="71" cy="57" r="3" fill="#130426" />
      <circle cx="101" cy="56" r="3" fill="#130426" />
      <circle cx="101" cy="74" r="3" fill="#130426" />
    </svg>
  )
}

export default function AppHomePage() {
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <style>{`
        /* Three equal entry cards (1fr each), stretched to equal height so removing Plan by
           area's old sub-panels doesn't leave it shorter than the other two. */
        .home4-primary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; align-items: stretch; }
        .home4-card { border-radius: 14px; padding: 28px 28px 24px; color: #130426; display: flex; flex-direction: column; border: 2px solid #000000; box-shadow: 6px 6px 0 rgba(0,0,0,0.75); transition: transform 140ms ease, box-shadow 140ms ease; }
        .home4-card:hover { transform: translateY(-3px); box-shadow: 8px 8px 0 rgba(0,0,0,0.88); }
        .home-approach-link { display: inline-block; margin-top: 10px; font-family: ${hv}; font-size: 15px; font-weight: 700; color: #130426; text-decoration: underline; text-underline-offset: 3px; }
        @media (max-width: 900px) {
          .home4-primary { grid-template-columns: 1fr; }
        }
      `}</style>

      <HomeOnboardingIndicator />

      <LandingContainer as="main">
        {/* Welcome + a short orienting paragraph that links to the About → Approach section. */}
        <div style={{ marginBottom: 40 }}>
          <h1 className="text-h1 text-[#130426]" style={{ marginBottom: 14 }}>Welcome to your Planning Studio</h1>
          <p style={{ fontFamily: hv, fontSize: 20, lineHeight: 1.5, fontWeight: 500, color: '#130426', maxWidth: 680, margin: '0 0 16px' }}>
            A space to reflect, learn, and plan for the end of life.
          </p>
          <p style={{ fontFamily: hv, fontSize: 16, lineHeight: 1.5, fontWeight: 400, color: '#130426', maxWidth: 680, margin: 0 }}>
            End-of-life planning is often treated as paperwork to get through as fast as possible. This platform takes the opposite approach, inviting you to slow down and plan with intention, on your own or with the people in your life.
          </p>
          <Link href="/app/about#approach" className="home-approach-link">Read more about the approach →</Link>
        </div>

        {/* One row: Activities + Your materials are entry cards (title + Open link, whole
            card clickable); Plan by area is wider and holds the six area links. */}
        <div className="home4-primary">

          {/* Activities (Sunrise) — entry card → the Activities landing */}
          <EntryCard
            href="/app/activities"
            bg="#F29836"
            title="Activities"
            description="Conversation starters, scenarios, and reflection prompts."
            puzzle={<ActivitiesPuzzle />}
          />

          {/* Plan by area (Dusk) — an entry card like the other two. Its old nested area
              sub-panels were removed; the six areas live on the Plan by area landing. */}
          <EntryCard
            href="/app/area"
            bg="#BBABF4"
            title="Plan by area"
            description="Work through each area of your end-of-life planning. Learn about your options, track tasks, and capture related thinking."
            puzzle={<PlanPuzzle />}
          />

          {/* Your materials (Sunset) — entry card → Your materials */}
          <EntryCard
            href="/app/materials"
            bg="#DB5835"
            onDark
            title="Your materials"
            description="This is where all your stuff lives: notes, activity outputs, and documents."
            puzzle={<MaterialsPuzzle />}
          />

        </div>

      </LandingContainer>
    </div>
  )
}

// All three entry cards (Activities, Plan by area, Your materials): title on its own full-width
// line, the puzzle floated right after it (text wraps around / runs full-width), "Open →"
// bottom-right below the description. The grid stretches them to equal height (align-items:
// stretch); "Open →" pins to the card bottom (margin-top:auto) so their baselines align.
// min-height is a floor so short-copy cards don't collapse below the tallest. Tune this value.
const ENTRY_CARD_MIN_HEIGHT = 268
function EntryCard({ href, bg, onDark = false, title, description, puzzle }: { href: string; bg: string; onDark?: boolean; title: string; description: string; puzzle: React.ReactNode }) {
  const titleColor = onDark ? '#F8F4EB' : '#130426'
  const descColor = onDark ? 'rgba(248,244,235,0.92)' : 'rgba(19,4,38,0.85)'
  return (
    <Link href={href} className="home4-card" style={{ background: bg, textDecoration: 'none', minHeight: ENTRY_CARD_MIN_HEIGHT }}>
      <div style={{ overflow: 'hidden' }}>
        <h2 style={{ fontFamily: hv, fontSize: 26, fontWeight: 600, letterSpacing: '-0.3px', color: titleColor, margin: '0 0 6px' }}>{title}</h2>
        <div style={{ float: 'right', marginLeft: 8, marginRight: -10, marginBottom: 8 }}>{puzzle}</div>
        <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.55, color: descColor, margin: 0 }}>{description}</p>
      </div>
      <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: titleColor, marginTop: 'auto', alignSelf: 'flex-end' }}>Open →</span>
    </Link>
  )
}

