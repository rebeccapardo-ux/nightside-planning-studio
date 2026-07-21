'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSectionCollapse } from './useSectionCollapse'
import { SECTION_SCROLL_MARGIN_TOP } from '@/lib/ui'

const apfel = "'Apfel Grotezk', sans-serif"

// Section-level collapse for the area page's "Relevant Activities" and "Plan" sections.
// Default COLLAPSED on a user's first visit to the area (so the page isn't overwhelming on
// first landing), then remembers their choice per section (shared model with the Overview
// band — see useSectionCollapse). The header (title + chevron) stays visible when
// collapsed; the body unmounts.
//
// deepLinkParam: when set and the URL carries `?section=<deepLinkParam>` (e.g. Key Details'
// "Care preferences" / "Final resting place wishes" links use `?section=plan`), this
// section opens and scrolls to the top of the viewport on load — so the user lands ON it,
// not at the page top. The open is transient (not persisted — see useSectionCollapse).
export default function CollapsibleSection({ title, storageKey, children, deepLinkParam }: { title: string; storageKey: string; children: React.ReactNode; deepLinkParam?: string }) {
  const searchParams = useSearchParams()
  const isDeepLinked = !!deepLinkParam && searchParams.get('section') === deepLinkParam
  const [open, toggle] = useSectionCollapse(storageKey, false, isDeepLinked)
  const sectionRef = useRef<HTMLElement>(null)

  // Scroll the deep-linked section to the top of the viewport once on mount. setTimeout lets
  // the (now-open) body render first; scroll-margin-top offsets the sticky GlobalNav.
  useEffect(() => {
    if (!isDeepLinked) return
    const t = setTimeout(() => { sectionRef.current?.scrollIntoView({ block: 'start' }) }, 90)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // Vertical padding lives here (not the route wrapper) so it can shrink when
    // collapsed — matching the Overview band's values exactly, so all three section
    // bands are the same height when collapsed.
    <section ref={sectionRef} style={{ paddingTop: open ? 28 : 16, paddingBottom: open ? 48 : 16, scrollMarginTop: SECTION_SCROLL_MARGIN_TOP }}>
      <style>{`.cs-header:hover .cs-chevron { opacity: 0.65; }`}</style>
      <button
        type="button"
        className="cs-header"
        onClick={toggle}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <h2 style={{ fontFamily: apfel, fontSize: 30, fontWeight: 600, color: '#130426', margin: 0 }}>{title}</h2>
        <span className="cs-chevron" style={{ display: 'inline-flex', transition: 'opacity 150ms' }}>
          <Chevron open={open} />
        </span>
      </button>
      {open && <div style={{ marginTop: 8 }}>{children}</div>}
    </section>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>
      <path d="M4 6l4 4 4-4" stroke="#130426" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
