'use client'

import Link from 'next/link'
import HomeOnboardingIndicator from '@/app/components/HomeOnboardingIndicator'
import { AREAS } from '@/lib/areas'
import AreaIcon from '@/app/components/AreaIcon'

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

// "Open →" affordance inside the Plan by area card — routes to its landing page
// (orientation), sits between the description and the area sub-items, right-aligned to match
// the bottom-right "Open →" on the Activities / Your materials cards. position/zIndex lift it
// above the full-card overlay link so it stays independently clickable + focusable.
function OpenLink({ href }: { href: string }) {
  return (
    <Link href={href} style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#130426', textDecoration: 'none', alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginTop: 8, marginBottom: 8, position: 'relative', zIndex: 1 }}>Open →</Link>
  )
}

export default function AppHomePage() {
  const introP: React.CSSProperties = { fontFamily: hv, fontSize: 16, lineHeight: 1.65, fontWeight: 400, color: 'rgba(19,4,38,0.82)', margin: '0 0 16px' }
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <style>{`
        .home4 { max-width: 1100px; margin: 0 auto; padding: 56px 32px 80px; }
        /* Activities + Your materials are entry cards (1fr each); Plan by area is wider
           (it holds the six area links + Open). */
        /* Side cards (Activities, Your materials) sit at natural content height (align-self:start),
           so they're shorter than the taller Plan by area card — no forced min-height blank space. */
        .home4-primary { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 20px; align-items: start; }
        .home4-card { border-radius: 14px; padding: 28px 28px 24px; color: #130426; display: flex; flex-direction: column; border: 2px solid #000000; box-shadow: 6px 6px 0 rgba(0,0,0,0.75); transition: transform 140ms ease, box-shadow 140ms ease; }
        .home4-card:hover { transform: translateY(-3px); box-shadow: 8px 8px 0 rgba(0,0,0,0.88); }
        /* A hovered sub-tile is its OWN target (into a specific area) — it must not also lift
           the Plan-by-area card (whose hover routes to the landing page). :has() outweighs
           :hover on specificity, so it cancels the card lift while any tile is hovered. */
        .home4-card:has(.home4-sub:hover) { transform: none; box-shadow: 6px 6px 0 rgba(0,0,0,0.75); }
        /* grid-auto-rows: 1fr → all six area cards share one (tallest) row height. */
        .home4-subgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; grid-auto-rows: 1fr; }
        .home4-sub { background: rgba(255,255,255,0.5); border: 1px solid transparent; border-radius: 8px; padding: 12px 16px; min-height: 44px; display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 500; color: #130426; text-decoration: none; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease; }
        .home4-sub:hover { background: #FFFFFF; border-color: rgba(19,4,38,0.16); box-shadow: 0 3px 10px rgba(19,4,38,0.22); transform: translateY(-1px); }
        /* "More than paperwork" band — heading on top, body flowing in two columns
           beneath it, so it stays compact enough that the tops of the three panels
           still peek above the fold on desktop. */
        .home-intro-band { margin-bottom: 44px; }
        .home-intro-cols { column-count: 2; column-gap: 40px; }
        .home-intro-cols p { break-inside: avoid; }
        @media (max-width: 900px) {
          .home4-primary { grid-template-columns: 1fr; }
          .home4-subgrid { grid-template-columns: 1fr; }
          .home-intro-band { margin-bottom: 36px; }
        }
        @media (max-width: 640px) {
          .home-intro-cols { column-count: 1; }
        }
      `}</style>

      <HomeOnboardingIndicator />

      <main className="home4">
        {/* Welcome — current treatment preserved */}
        <div style={{ marginBottom: 32 }}>
          <h1 className="text-h1 text-[#130426]" style={{ marginBottom: 14 }}>Welcome to your Planning Studio</h1>
          <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.6, fontWeight: 400, color: '#130426', maxWidth: 680, margin: 0 }}>
            A space to reflect, learn, and plan for the end of life. Start anywhere, and go at your own pace.
          </p>
        </div>

        {/* "More than paperwork" — editorial band (returning content from the old homepage),
            two-column so it stays short enough for the panels below to peek above the fold. */}
        <section className="home-intro-band">
          <h2 style={{ fontFamily: hv, fontSize: 29, fontWeight: 400, letterSpacing: '-0.4px', lineHeight: 1.15, color: '#130426', margin: 0 }}>
            More than paperwork
          </h2>
          <div style={{ width: 48, height: 4, borderRadius: 999, background: '#DB5835', margin: '14px 0 24px' }} aria-hidden="true" />
          <div className="home-intro-cols">
            <p style={introP}>
              End-of-life planning is often treated as just filling out forms, checking boxes, and getting it over with as fast as possible. This platform takes the opposite approach, inviting you to slow down and engage in a deeper process of reflection.
            </p>
            <p style={introP}>
              It&rsquo;s designed to help you explore your values, clarify your priorities, document your plans with intention, and create opportunities for meaningful conversations with loved ones.
            </p>
            <p style={introP}>
              By leaning into curiosity and addressing the emotional as well as the practical, this process can provide clarity and comfort, both for you and the people in your life.
            </p>
          </div>
        </section>

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

          {/* Plan by area (Dusk) — the whole card routes to the Plan by area landing via an
              absolute overlay link (the six area links + "Open →" sit above it with z-index, so
              they keep their own destinations; clicking anywhere else — title, description, gaps
              — hits the overlay). Same full-card-click pattern as the YourMaterials item cards.
              Keyboard route is the visible "Open →" + the six focusable area links. */}
          <section className="home4-card" style={{ background: '#BBABF4', position: 'relative', isolation: 'isolate' }}>
            <Link href="/app/area" aria-hidden="true" tabIndex={-1} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} />
            <CardTop title="Plan by area" description="Work through each area of your end-of-life planning. Learn about your options, track tasks, and capture related thinking.">
              <PlanPuzzle />
            </CardTop>
            <OpenLink href="/app/area" />
            <div className="home4-subgrid" style={{ position: 'relative', zIndex: 1 }}>
              {AREAS.map((area) => <SubItem key={area.slug} href={`/app/area/${area.slug}`} label={area.title} slug={area.slug} />)}
            </div>
          </section>

          {/* Your materials (Sunset) — entry card → Your materials */}
          <EntryCard
            href="/app/materials"
            bg="#DB5835"
            onDark
            title="Your materials"
            description="This is where all your stuff lives: notes, activity outputs, and documents to fill out."
            puzzle={<MaterialsPuzzle />}
          />

        </div>

      </main>
    </div>
  )
}

function CardTop({ title, description, onDark = false, children }: { title: string; description: string; onDark?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontFamily: hv, fontSize: 26, fontWeight: 600, letterSpacing: '-0.3px', color: onDark ? '#F8F4EB' : '#130426', margin: '0 0 6px' }}>{title}</h2>
        <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.55, color: onDark ? 'rgba(248,244,235,0.92)' : 'rgba(19,4,38,0.85)', maxWidth: 320, margin: 0 }}>{description}</p>
      </div>
      {/* Drop the puzzle ~one title-line down so it sits at description level, matching the
          float-right puzzles on the Activities / Your materials entry cards. */}
      <div style={{ flexShrink: 0, marginTop: 34 }}>{children}</div>
    </div>
  )
}

// Activities + Your materials entry cards: title on its own full-width line, the puzzle
// floated right after it (text wraps around / runs full-width), "Open →" bottom-right just
// below the description. They sit at **natural content height** (align-self: start) — shorter
// than the taller Plan by area card, with no forced blank space. Because both carry a
// title + a short description + Open, their heights (and the "Open →" positions) land at
// roughly the same place naturally.
function EntryCard({ href, bg, onDark = false, title, description, puzzle }: { href: string; bg: string; onDark?: boolean; title: string; description: string; puzzle: React.ReactNode }) {
  const titleColor = onDark ? '#F8F4EB' : '#130426'
  const descColor = onDark ? 'rgba(248,244,235,0.92)' : 'rgba(19,4,38,0.85)'
  return (
    <Link href={href} className="home4-card" style={{ background: bg, textDecoration: 'none', alignSelf: 'start' }}>
      <div style={{ overflow: 'hidden' }}>
        <h2 style={{ fontFamily: hv, fontSize: 26, fontWeight: 600, letterSpacing: '-0.3px', color: titleColor, margin: '0 0 6px' }}>{title}</h2>
        <div style={{ float: 'right', marginLeft: 8, marginRight: -10, marginBottom: 8 }}>{puzzle}</div>
        <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.55, color: descColor, margin: 0 }}>{description}</p>
      </div>
      <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: titleColor, marginTop: 24, alignSelf: 'flex-end' }}>Open →</span>
    </Link>
  )
}

function SubItem({ href, label, slug }: { href: string; label: string; slug: string }) {
  return (
    <Link href={href} className="home4-sub">
      {/* Fixed-width icon gutter → every label starts at the same x, one line or two. The
          tile (.home4-sub) is align-items:center and equal-height (grid-auto-rows:1fr), so
          the 18px icon sits at the tile's vertical center — not the first line — keeping the
          two wrapping tiles ("Healthcare Wishes", "Ritual & Ceremony") from looking lopsided. */}
      <span style={{ width: 18, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <AreaIcon slug={slug} size={18} color="#130426" />
      </span>
      <span style={{ minWidth: 0 }}>{label}</span>
    </Link>
  )
}
