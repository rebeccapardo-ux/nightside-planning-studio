import type React from 'react'
import { LANDING_MAX_WIDTH, LANDING_PADDING_X } from '@/app/components/LandingContainer'

// SINGLE SOURCE OF TRUTH for the horizontal measure of the area-page bands — the centered inner
// container inside each full-bleed colored band (Overview/Resources/Activities/Plan) and the
// navy header. Collapses what were TWO mechanisms — Tailwind `max-w-6xl px-10` on the page
// bands + inline 40px in AreaHeader — into one place, so the width + horizontal padding can't
// silently diverge again. Horizontal only; each band keeps its own vertical padding
// (CollapsibleSection for the content bands, AreaHeader inline for the header/overview bands).
//
// WIDTH DECISION (pending review): currently pointed at the shared LANDING measure (1200 / 24)
// so the area pages can be evaluated at the landing-page width. If we instead keep the area
// pages at their own reading-friendly width, change ONLY these two references here (e.g. a
// local `const AREA_MAX_WIDTH = 1152`, `AREA_PADDING_X = 40`) — the single-source unification
// holds either way.
export const areaBandInnerStyle: React.CSSProperties = {
  maxWidth: LANDING_MAX_WIDTH,
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: LANDING_PADDING_X,
  paddingRight: LANDING_PADDING_X,
}
