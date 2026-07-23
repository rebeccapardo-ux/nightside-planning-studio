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

// Subtle grain over the banner FILL to soften the flat-field harshness. Implemented with
// background-blend-mode (no DOM overlay, no stacking/position changes): spread this alongside a
// `backgroundColor` and the grain image layer blends with the color in 'overlay' mode. Content
// (text/breadcrumbs/buttons) is unaffected — only the background layers blend. The tile is a
// fixed 180×180 SVG repeated at 180px, so the grain scale is identical on a narrow and a wide
// banner. Filter chain: feTurbulence (fractalNoise) → feColorMatrix saturate=0, which neutralizes
// the RGB speckle into grey grain (fractalNoise turbulates all three channels independently).
// baseFrequency 0.55 = coarser/discrete particles (vs a fine haze); numOctaves 2 = an even field
// without the low-frequency cloudiness that higher octaves add. The filtered rect's opacity (0.42)
// is the SINGLE tuning value — uniform across Sunset / Night / Dusk, not tuned per color.
// The grain SVG data URI — the first (top) background layer. Kept as its own const so both the
// section-token banners and the palette-token document banner compose the same tile.
const GRAIN_SVG =
  `url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='180'%20height='180'%3E%3Cfilter%20id='ns-grain'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.55'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3CfeColorMatrix%20type='saturate'%20values='0'/%3E%3C/filter%3E%3Crect%20width='180'%20height='180'%20filter='url(%23ns-grain)'%20opacity='0.42'/%3E%3C/svg%3E")`

// Two background layers: grain (top) blended `overlay` against a chroma-shift gradient (bottom)
// blended `normal`. The gradient runs 115deg (muted end toward the lower-right, where the empty
// banner area is) from full-chroma → reduced-chroma at ~constant luminance, so text contrast is
// unaffected. Layer order and blend-mode list must correspond: grain first ↔ overlay first, so
// the grain blends against the gradient beneath it (not vice-versa). The gradient uses the
// section token pair; DocHeaderBanner builds its own from palette tokens (it has no theme
// ancestor). `backgroundColor` (set by the caller) stays as the fallback beneath both layers.
export const bannerGrainStyle = (gradient: string): React.CSSProperties => ({
  backgroundImage: `${GRAIN_SVG}, ${gradient}`,
  backgroundBlendMode: 'overlay, normal',
  backgroundRepeat: 'repeat, no-repeat',
  backgroundSize: '180px 180px, cover',
})

// Section-token gradient (activity + area banners, which render under a theme-* ancestor).
export const BANNER_GRAIN: React.CSSProperties = bannerGrainStyle(
  'linear-gradient(115deg, var(--section-accent) 0%, var(--section-accent-muted) 100%)',
)

// The banner IS the section-color surface: its background derives from the section theme
// (--section-accent, set by the section layout) and its default text color from
// --section-on-accent. Fallback to navy / white where no section theme is present. Banner text
// that used to hardcode white must drop that override to inherit --section-on-accent. The
// section color is now `backgroundColor` (split out of the `background` shorthand) so the grain
// image layer (BANNER_GRAIN) can sit alongside it and blend.
export const BANNER_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--section-accent, var(--color-night))',
  ...BANNER_GRAIN,
  color: 'var(--section-on-accent, #ffffff)',
  paddingBottom: BANNER_PADDING_BOTTOM,
}
