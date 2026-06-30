'use client'

import { useSectionCollapse } from './useSectionCollapse'

const apfel = "'Apfel Grotezk', sans-serif"

// Section-level collapse for the area page's "Relevant Activities" and "Plan" sections.
// Default EXPANDED on a user's first visit to the area, then remembers their choice per
// section (shared model with the Overview band — see useSectionCollapse). The header
// (title + chevron) stays visible when collapsed; the body unmounts.
export default function CollapsibleSection({ title, storageKey, children }: { title: string; storageKey: string; children: React.ReactNode }) {
  const [open, toggle] = useSectionCollapse(storageKey)
  return (
    // Vertical padding lives here (not the route wrapper) so it can shrink when
    // collapsed — matching the Overview band's values exactly, so all three section
    // bands are the same height when collapsed.
    <section style={{ paddingTop: open ? 28 : 24, paddingBottom: open ? 48 : 24 }}>
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
