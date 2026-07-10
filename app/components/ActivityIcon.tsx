import { Scale, MessageCircle, Split, Route, Lightbulb, type LucideIcon } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Per-activity IDENTITY icons (item-level), now drawn from Lucide. One source of
// geometry for every surface that shows a single NAMED activity: the Activities
// landing cards, the area-page "Relevant Activities" cards, the "Activity outputs"
// list in Your materials, and the wishes-doc "Relevant materials" panels.
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
// The component API is unchanged (size / color / decorative / className); only the
// internals swapped from hand-built SVGs to Lucide. Lucide's default strokeWidth=2
// is the single weight we want; `color` drives stroke (default currentColor, but
// every surface passes it explicitly — Midnight #130426 on landing, Night #2C3777
// on area/materials/wishes).
//
// Slug → Lucide mapping (primary; some are judgment calls under review):
//   reflection_prompts → MessageCircle   (alternates: MessageCircleQuestion, Quote)
//   values_ranking     → Scale
//   fears_ranking      → Scale            (same glyph as values, by design)
//   scenario_navigator → Split            (alternate: Route)
//   legacy_map         → Route            (alternates: Milestone, MapPinned)
//   deathcare_trivia   → Lightbulb        (alternate: HelpCircle / CircleHelp)
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityIconSlug =
  | 'reflection_prompts'
  | 'values_ranking'
  | 'fears_ranking'
  | 'scenario_navigator'
  | 'deathcare_trivia'
  | 'legacy_map'

const ICONS: Record<ActivityIconSlug, LucideIcon> = {
  reflection_prompts: MessageCircle,
  values_ranking: Scale,
  fears_ranking: Scale,
  scenario_navigator: Split,
  legacy_map: Route,
  deathcare_trivia: Lightbulb,
}

const TITLES: Record<ActivityIconSlug, string> = {
  reflection_prompts: 'Reflection Prompts',
  values_ranking: 'Values Ranking',
  fears_ranking: 'Fears Ranking',
  scenario_navigator: 'Scenario Navigator',
  deathcare_trivia: 'Deathcare Trivia',
  legacy_map: 'Legacy Map',
}

export default function ActivityIcon({
  slug,
  size = 24,
  color = 'currentColor',
  // A text label almost always sits next to these icons, so decorative
  // (aria-hidden) is the default. Pass decorative={false} to expose the label.
  decorative = true,
  className,
}: {
  slug: string
  size?: number
  color?: string
  decorative?: boolean
  className?: string
}) {
  const Icon = (ICONS as Record<string, LucideIcon | undefined>)[slug]
  if (!Icon) return null
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={2}
      className={className}
      style={{ flexShrink: 0, display: 'block' }}
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': TITLES[slug as ActivityIconSlug] })}
    />
  )
}
