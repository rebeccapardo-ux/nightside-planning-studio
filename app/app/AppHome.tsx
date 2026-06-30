'use client'

import Link from 'next/link'
import HomeOnboardingIndicator from '@/app/components/HomeOnboardingIndicator'
import { AREAS } from '@/lib/areas'

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
    <Link href={href} style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#130426', textDecoration: 'none', alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginBottom: 8, position: 'relative', zIndex: 1 }}>Open →</Link>
  )
}

export default function AppHomePage() {
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <style>{`
        .home4 { max-width: 1100px; margin: 0 auto; padding: 56px 32px 80px; }
        /* Activities + Your materials are entry cards (1fr each); Plan by area is wider
           (it holds the six area links + Open). */
        /* Side cards (Activities, Your materials) sit at natural content height (align-self:start),
           so they're shorter than the taller Plan by area card — no forced min-height blank space. */
        .home4-primary { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 20px; align-items: start; }
        .home4-card { border-radius: 14px; padding: 28px 28px 24px; color: #130426; display: flex; flex-direction: column; }
        /* grid-auto-rows: 1fr → all six area cards share one (tallest) row height. */
        .home4-subgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; grid-auto-rows: 1fr; }
        .home4-sub { background: rgba(255,255,255,0.5); border-radius: 8px; padding: 12px 16px; min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 14px; font-weight: 500; color: #130426; text-decoration: none; transition: background 0.15s ease; }
        .home4-sub:hover { background: rgba(255,255,255,0.85); }
        @media (max-width: 900px) {
          .home4-primary { grid-template-columns: 1fr; }
          .home4-subgrid { grid-template-columns: 1fr; }
        }
      `}</style>

      <HomeOnboardingIndicator />

      <main className="home4">
        {/* Welcome — current treatment preserved */}
        <div style={{ marginBottom: 48 }}>
          <h1 className="text-h1 text-[#130426]" style={{ marginBottom: 14 }}>Welcome to your Planning Studio</h1>
          <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.6, fontWeight: 400, color: '#130426', maxWidth: 680, margin: 0 }}>
            A space to reflect, learn, and plan. Start anywhere, and go at your own pace.
          </p>
        </div>

        {/* One row: Activities + Your materials are entry cards (title + Open link, whole
            card clickable); Plan by area is wider and holds the six area links. */}
        <div className="home4-primary">

          {/* Activities (Sunrise) — entry card → the Activities landing */}
          <EntryCard
            href="/app/activities"
            bg="#F29836"
            title="Activities"
            description="Conversation starters, scenarios, and reflection prompts to clarify what matters most."
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
              {AREAS.map((area) => <SubItem key={area.slug} href={`/app/area/${area.slug}`} label={area.title} />)}
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
        <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.55, color: onDark ? 'rgba(248,244,235,0.92)' : 'rgba(19,4,38,0.85)', maxWidth: 320, margin: 0 }}>{description}</p>
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
        <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.55, color: descColor, margin: 0 }}>{description}</p>
      </div>
      <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: titleColor, marginTop: 24, alignSelf: 'flex-end' }}>Open →</span>
    </Link>
  )
}

function SubItem({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="home4-sub">
      <span>{label}</span>
      <span aria-hidden="true" style={{ fontSize: 14, opacity: 0.6, flexShrink: 0 }}>→</span>
    </Link>
  )
}
