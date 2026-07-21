import type React from 'react'
import { LANDING_MAX_WIDTH, LANDING_PADDING_X } from '@/app/components/LandingContainer'

// SINGLE SOURCE OF TRUTH for the horizontal measure of the area-page bands — the centered inner
// container inside each full-bleed colored band (Overview/Resources/Activities/Plan) and the
// navy header. Collapses what were TWO mechanisms — Tailwind `max-w-6xl px-10` on the page
// bands + inline 40px in AreaHeader — into one place, so the width + horizontal padding can't
// silently diverge again. Horizontal only; each band keeps its own vertical padding
// (CollapsibleSection for the content bands, AreaHeader inline for the header/overview bands).
//
// WIDTH: area pages share the LANDING measure (1200 / 24) — decided after previewing that the
// content still reads well at that width (prose is anyway capped by content-level maxWidths),
// so the whole app is on one width source. To diverge the area-page width again, swap these two
// references for local constants here; the single-source unification holds either way.
export const areaBandInnerStyle: React.CSSProperties = {
  maxWidth: LANDING_MAX_WIDTH,
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: LANDING_PADDING_X,
  paddingRight: LANDING_PADDING_X,
}
