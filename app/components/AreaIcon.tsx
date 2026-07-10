import { HeartPlus, Moon, UsersRound, TreePine, Scroll, Folder, type LucideIcon } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Per-AREA identity icons, drawn from Lucide. A separate family from ActivityIcon
// (the two registers are intentionally distinct), but the same shape of component:
// slug-keyed, single 2px Lucide weight, color passed per surface (never baked in).
//
// Keyed by the area `slug` (lib/areas.ts `AreaSlug` — the route param, and the key
// the Plan-by-area cards already use). Currently used only on the Plan-by-area
// entry cards; kept generic so other area surfaces can adopt it later.
//
// Slug → Lucide mapping:
//   healthcare-wishes   → HeartPlus
//   deathcare           → Moon
//   ritual-and-ceremony → UsersRound
//   legacy              → TreePine
//   wills-and-estates   → Scroll
//   personal-admin      → Folder
// ─────────────────────────────────────────────────────────────────────────────

export type AreaIconSlug =
  | 'healthcare-wishes'
  | 'deathcare'
  | 'ritual-and-ceremony'
  | 'legacy'
  | 'wills-and-estates'
  | 'personal-admin'

const ICONS: Record<AreaIconSlug, LucideIcon> = {
  'healthcare-wishes': HeartPlus,
  'deathcare': Moon,
  'ritual-and-ceremony': UsersRound,
  'legacy': TreePine,
  'wills-and-estates': Scroll,
  'personal-admin': Folder,
}

const TITLES: Record<AreaIconSlug, string> = {
  'healthcare-wishes': 'Healthcare Wishes',
  'deathcare': 'Deathcare',
  'ritual-and-ceremony': 'Ritual & Ceremony',
  'legacy': 'Legacy',
  'wills-and-estates': 'Wills & Estates',
  'personal-admin': 'Personal Admin',
}

export default function AreaIcon({
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
        : { role: 'img', 'aria-label': TITLES[slug as AreaIconSlug] })}
    />
  )
}
