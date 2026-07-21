import type React from 'react'

// SINGLE SOURCE for the app's page banner — the full-bleed navy header band (breadcrumb, title
// .ns-title-activity, intro). Used by the area banner (AreaHeader) and all six activity banners.
//
// SHARED = the VERTICAL treatment (top + bottom) + the navy background — identical on every
// banner, so the generous feel can't drift (previously copy-pasted inline into six pages).
// NOT SHARED = the HORIZONTAL treatment, by design: the activity banners use a 96px left inset
// (BANNER_CLASS); the AREA banner stays content-aligned (centered via areaBandInnerStyle) so its
// title lines up with the page content beneath it — it consumes only the vertical values below.
export const BANNER_TOP_CLASS = 'pt-16 md:pt-6'  // top: 64px mobile / 24px desktop (shared)
export const BANNER_PADDING_BOTTOM = 60          // bottom, px (shared)

// Activity-banner horizontal (96px left inset) + the shared top. Each activity banner appends
// its own right side: `md:pr-8`, or `md:pr-[148px] activity-banner-row` + a flex row style for
// the three with a right-side control (legacy-map / values-ranking / fears-ranking).
export const BANNER_CLASS = `px-5 md:pl-24 ${BANNER_TOP_CLASS}`
// The banner IS the section-color surface: its background derives from the section theme
// (--section-accent, set by the section layout) and its default text color from
// --section-on-accent. Fallback to navy / white where no section theme is present. Banner text
// that used to hardcode white must drop that override to inherit --section-on-accent.
export const BANNER_STYLE: React.CSSProperties = {
  background: 'var(--section-accent, var(--color-night))',
  color: 'var(--section-on-accent, #ffffff)',
  paddingBottom: BANNER_PADDING_BOTTOM,
}
