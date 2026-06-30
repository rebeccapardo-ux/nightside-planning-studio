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
function ActivitiesPuzzle() {
  return (
    <svg width="98" height="91" viewBox="0 0 140 130" style={{ flexShrink: 0, overflow: 'visible' }} aria-hidden="true">
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
function MaterialsPuzzle() {
  return (
    <svg width="98" height="91" viewBox="0 0 140 130" style={{ flexShrink: 0, overflow: 'visible' }} aria-hidden="true">
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

const ACTIVITIES = [
  { label: 'Reflection Prompts', href: '/app/reflect/reflection-prompts' },
  { label: 'Values & Fears Ranking', href: '/app/reflect/values-and-fears' },
  { label: 'Scenario Navigator', href: '/app/reflect/scenario-navigator' },
  { label: 'Legacy Map', href: '/app/reflect/legacy-map' },
  { label: 'Deathcare Trivia', href: '/app/learn/trivia' },
]

export default function AppHomePage() {
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>
      <style>{`
        .home4 { max-width: 1100px; margin: 0 auto; padding: 56px 32px 80px; }
        .home4-primary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .home4-card { border-radius: 14px; padding: 28px 28px 24px; color: #130426; display: flex; flex-direction: column; min-height: 340px; }
        .home4-subgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: auto; }
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

        {/* Primary row — Activities + Plan by area */}
        <div className="home4-primary">

          {/* Activities (Sunrise) */}
          <section className="home4-card" style={{ background: '#F29836' }}>
            <CardTop title="Activities" description="Conversation starters, scenarios, and reflection prompts to clarify what matters most. Use alone or with others.">
              <ActivitiesPuzzle />
            </CardTop>
            <div className="home4-subgrid">
              {ACTIVITIES.map((a) => <SubItem key={a.label} href={a.href} label={a.label} />)}
            </div>
          </section>

          {/* Plan by area (Dusk) */}
          <section className="home4-card" style={{ background: '#BBABF4' }}>
            <CardTop title="Plan by area" description="Work through each area of your end-of-life planning. Learn about your options, track tasks, and capture related thinking.">
              <PlanPuzzle />
            </CardTop>
            <div className="home4-subgrid">
              {AREAS.map((area) => <SubItem key={area.slug} href={`/app/area/${area.slug}`} label={area.title} />)}
            </div>
          </section>

        </div>

        {/* Your materials (Sunset) — secondary surface, full-width beneath the two
            primary cards. Whole card clickable. The puzzle sits directly to the RIGHT of
            the content (not pushed to the banner's far edge). */}
        <Link
          href="/app/plan/materials"
          style={{ display: 'flex', alignItems: 'center', gap: 28, background: '#DB5835', color: '#F8F4EB', textDecoration: 'none', borderRadius: 14, padding: '26px 28px', minHeight: 160 }}
        >
          <div style={{ minWidth: 0, maxWidth: 520 }}>
            <h2 style={{ fontFamily: hv, fontSize: 26, fontWeight: 600, letterSpacing: '-0.3px', color: '#F8F4EB', margin: '0 0 6px' }}>Your materials</h2>
            <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.55, color: 'rgba(248,244,235,0.92)', margin: '0 0 10px' }}>
              This is where all your stuff lives: notes, activity outputs, and documents to fill out.
            </p>
            <span style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#F8F4EB' }}>Open →</span>
          </div>
          <MaterialsPuzzle />
        </Link>

      </main>
    </div>
  )
}

function CardTop({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontFamily: hv, fontSize: 26, fontWeight: 600, letterSpacing: '-0.3px', color: '#130426', margin: '0 0 6px' }}>{title}</h2>
        <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.55, color: 'rgba(19,4,38,0.85)', maxWidth: 320, margin: 0 }}>{description}</p>
      </div>
      {children}
    </div>
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
