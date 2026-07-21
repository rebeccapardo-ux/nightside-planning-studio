import type React from 'react'
import { LANDING_MAX_WIDTH, LANDING_PADDING_X } from '@/app/components/LandingContainer'

// SINGLE SOURCE for the app's page banner — the full-bleed section-colored header band
// (breadcrumb, title .ns-title-activity, intro). Used by the area banner (AreaHeader) and all
// activity banners (the six activity pages + the five scenario/outcome banners).
//
// SHARED across every banner: the VERTICAL treatment (top + bottom), the section-color
// background, AND the HORIZONTAL treatment. The horizontal measure (BANNER_INNER_STYLE) centers
// the banner content in the SAME 1200/24 column as the area-page bands (areaBandInnerStyle) and
// the landing container — so the activity and area banners line up pixel-for-pixel and future
// pages inherit the match. (Previously the activity banners used a fixed 96px left inset while
// the area banner was content-centered; that visible mismatch when moving between sections is
// why the horizontal treatment is now shared here.)
export const BANNER_TOP_CLASS = 'pt-16 md:pt-6'  // top: 64px mobile / 24px desktop (shared)
export const BANNER_PADDING_BOTTOM = 60          // bottom, px (shared)

// Horizontal measure — centers banner content in the 1200/24 column, applied as PADDING on the
// full-bleed banner element itself so the colored background still runs edge-to-edge (no inner
// wrapper needed). Pixel-identical to areaBandInnerStyle (maxWidth 1200 + auto margins + 24
// padding): content's left edge = (100% − 1200)/2 + 24, clamped to 24 below 1200px viewports.
// Both derive from the LANDING_* constants, so the banner and area bands can't silently diverge.
const BANNER_GUTTER = `max(${LANDING_PADDING_X}px, calc((100% - ${LANDING_MAX_WIDTH}px) / 2 + ${LANDING_PADDING_X}px))`
export const BANNER_INNER_STYLE: React.CSSProperties = {
  paddingLeft: BANNER_GUTTER,
  paddingRight: BANNER_GUTTER,
}

// The banner IS the section-color surface: its background derives from the section theme
// (--section-accent, set by the section layout) and its default text color from
// --section-on-accent. Fallback to navy / white where no section theme is present. Banner text
// that used to hardcode white must drop that override to inherit --section-on-accent.
export const BANNER_STYLE: React.CSSProperties = {
  background: 'var(--section-accent, var(--color-night))',
  color: 'var(--section-on-accent, #ffffff)',
  paddingBottom: BANNER_PADDING_BOTTOM,
}
