import React from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Per-activity IDENTITY icons (item-level). One source of geometry for every
// surface that shows a single NAMED activity: the Activities landing cards, the
// area-page "Relevant Activities" cards, the "Activity outputs" list in Your
// materials, and the wishes-doc "Relevant materials" panels.
//
// This is a SUB-LEVEL set. It does NOT touch the category-level activity-outputs /
// document / note glyphs — those stay wherever a material *type* is labelled
// generically. Only activity outputs have a sub-identity (which activity), so only
// they get an item-level icon.
//
// Keyed by the entries.activity slug (underscore form) so callers can pass
// `entry.activity` / `act.activity` directly — plus `deathcare_trivia`, which
// produces no entries but appears as an entry point.
//
// Geometry: 24×24 viewBox, single-weight 2px outline (round caps/joins) EXCEPT the
// noted fills. vector-effect="non-scaling-stroke" keeps the stroke a constant 2px
// at every render size. `color` sets stroke AND the fills; default currentColor,
// but every surface passes it explicitly.
//
// Small-tier rule (threshold, not blanket): below 20px, the Legacy Map
// constellation drops to a wider-spaced 4-star variant so it holds up next to
// 16px peers. (The scale is the other dense glyph — reviewed at 16px; a simplified
// variant can be added here if it muddies. Trivia never renders below 24px.)
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityIconSlug =
  | 'reflection_prompts'
  | 'values_ranking'
  | 'fears_ranking'
  | 'scenario_navigator'
  | 'deathcare_trivia'
  | 'legacy_map'

const KNOWN: readonly string[] = [
  'reflection_prompts', 'values_ranking', 'fears_ranking',
  'scenario_navigator', 'deathcare_trivia', 'legacy_map',
]

const TITLES: Record<ActivityIconSlug, string> = {
  reflection_prompts: 'Reflection Prompts',
  values_ranking: 'Values Ranking',
  fears_ranking: 'Fears Ranking',
  scenario_navigator: 'Scenario Navigator',
  deathcare_trivia: 'Deathcare Trivia',
  legacy_map: 'Legacy Map',
}

// 4-point sparkle (filled) centred at (cx,cy), arm length a. Concave sides via a
// quadratic control point at the centre.
function sparkle(cx: number, cy: number, a: number): string {
  return (
    `M${cx} ${cy - a}Q${cx} ${cy} ${cx + a} ${cy}` +
    `Q${cx} ${cy} ${cx} ${cy + a}Q${cx} ${cy} ${cx - a} ${cy}` +
    `Q${cx} ${cy} ${cx} ${cy - a}Z`
  )
}

export default function ActivityIcon({
  slug,
  size = 24,
  color = 'currentColor',
  decorative = true,
  className,
}: {
  slug: string
  size?: number
  color?: string
  // A text label almost always sits next to these icons, so decorative (aria-hidden)
  // is the default. Pass decorative={false} to expose the <title> to AT.
  decorative?: boolean
  className?: string
}) {
  if (!KNOWN.includes(slug)) return null
  const s = slug as ActivityIconSlug
  const small = size < 20

  // Shared stroke attributes for outlined elements.
  const st = {
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }
  const fillProps = { fill: color, stroke: 'none' }

  let body: React.ReactNode = null

  if (s === 'reflection_prompts') {
    // Cloud — closed single outline, no trailing bubbles.
    body = <path {...st} d="M7 17h9.4a3.4 3.4 0 1 0-.42-6.77 4.5 4.5 0 0 0-8.52-1.4A3.5 3.5 0 0 0 7 17Z" />
  } else if (s === 'values_ranking' || s === 'fears_ranking') {
    // Balance scale — Values and Fears deliberately share this glyph.
    body = (
      <>
        <circle {...st} cx="12" cy="4" r="1.25" />
        <path {...st} d="M12 5.25V18" />
        <path {...st} d="M8.5 18h7" />
        <path {...st} d="M5 7.4h14" />
        {/* left pan */}
        <path {...st} d="M5 7.4 2.7 11M5 7.4 7.3 11" />
        <path {...st} d="M2.7 11a2.65 1.35 0 0 0 4.6 0" />
        {/* right pan */}
        <path {...st} d="M19 7.4 16.7 11M19 7.4 21.3 11" />
        <path {...st} d="M16.7 11a2.65 1.35 0 0 0 4.6 0" />
      </>
    )
  } else if (s === 'scenario_navigator') {
    // Three-way branching arrows.
    body = (
      <>
        <path {...st} d="M12 20V4" />
        <path {...st} d="M9.4 6.6 12 4 14.6 6.6" />
        <path {...st} d="M12 11.4C10.1 8.9 8 8 5.5 7.6" />
        <path {...st} d="M5.15 10.25 5.4 7.5 8.15 7.9" />
        <path {...st} d="M12 11.4C13.9 8.9 16 8 18.5 7.6" />
        <path {...st} d="M18.85 10.25 18.6 7.5 15.85 7.9" />
      </>
    )
  } else if (s === 'deathcare_trivia') {
    // Question-mark lightbulb — bulb + base stroked, "?" dot filled.
    body = (
      <>
        <path {...st} d="M12 3.5a5 5 0 0 0-3 9c.62.47 1 1.15 1 1.93v.57h4v-.57c0-.78.38-1.46 1-1.93a5 5 0 0 0-3-9Z" />
        <path {...st} d="M10 17h4" />
        <path {...st} d="M10.7 19h2.6" />
        <path {...st} d="M10.4 9a1.8 1.8 0 0 1 3.4.7c0 1.2-1.7 1.4-1.7 2.55" />
        <circle {...fillProps} cx="12" cy="14.4" r="0.9" />
      </>
    )
  } else if (s === 'legacy_map') {
    // Constellation — connecting lines stroked, stars = filled 4-point sparkles.
    if (small) {
      // 4-star, wider spacing — legible at 16px.
      body = (
        <>
          <path {...st} d="M4 15 10 8 16 15 21 8.5" />
          <path {...fillProps} d={sparkle(4, 15, 1.9)} />
          <path {...fillProps} d={sparkle(10, 8, 1.9)} />
          <path {...fillProps} d={sparkle(16, 15, 1.9)} />
          <path {...fillProps} d={sparkle(21, 8.5, 1.9)} />
        </>
      )
    } else {
      // Full 5-star, irregular path.
      body = (
        <>
          <path {...st} d="M4 15.5 8.5 8 13 16 17.5 8.5 21 12" />
          <path {...fillProps} d={sparkle(4, 15.5, 1.5)} />
          <path {...fillProps} d={sparkle(8.5, 8, 1.5)} />
          <path {...fillProps} d={sparkle(13, 16, 1.5)} />
          <path {...fillProps} d={sparkle(17.5, 8.5, 1.5)} />
          <path {...fillProps} d={sparkle(21, 12, 1.5)} />
        </>
      )
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ flexShrink: 0, display: 'block' }}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img' })}
    >
      {!decorative && <title>{TITLES[s]}</title>}
      {body}
    </svg>
  )
}
