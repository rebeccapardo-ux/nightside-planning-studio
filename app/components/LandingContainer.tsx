import type React from 'react'

// Single source of truth for the content width + horizontal padding of the top-level landing
// pages (Home, Activities, Plan by area, Your materials). Extracted so the four can't drift
// apart again (they previously hardcoded 1100/1200 with 24/32 px each).
//
// HARD INVARIANT — horizontal: maxWidth + horizontal padding are LOCKED here (not props). All
// landing pages are identical width, no exceptions.
// OVERRIDABLE — vertical: paddingTop/Bottom default to the standard 80/72, but are props so a
// page with a real reason can override — e.g. Your materials splits its vertical padding across
// two stacked sections while the page still starts at 80 under the nav and ends at 72.
//
// EXTENSION: this same width invariant is intended for the app's sub-pages (area pages) in a
// later standardization pass. Reuse THIS component — or the LANDING_MAX_WIDTH / LANDING_PADDING_X
// exports for full-bleed band layouts that center their own inner content — rather than
// inventing a parallel width system. (Area pages currently use max-w-6xl / px-10; adopting
// these constants is the planned unification.)

export const LANDING_MAX_WIDTH = 1200
export const LANDING_PADDING_X = 24

export default function LandingContainer({
  children, pt = 80, pb = 72, as: Tag = 'div',
}: {
  children: React.ReactNode
  pt?: number
  pb?: number
  as?: React.ElementType
}) {
  return (
    <Tag
      style={{
        maxWidth: LANDING_MAX_WIDTH,
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: LANDING_PADDING_X,
        paddingRight: LANDING_PADDING_X,
        paddingTop: pt,
        paddingBottom: pb,
      }}
    >
      {children}
    </Tag>
  )
}
