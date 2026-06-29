'use client'

import { useState } from 'react'

const apfel = "'Apfel Grotezk', sans-serif"

// Section-level collapse for the area page's "Relevant activities" and "Plan"
// sections. Default EXPANDED for everyone on every visit — no first-visit / per-area
// localStorage (that logic belongs to the Learn band, where "I've seen it" matters;
// here collapse is just transient focus, "hide this for now"). The header (title +
// chevron) stays visible when collapsed; the body unmounts. Subtle chevron toggle.
export default function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section>
      <style>{`.cs-header:hover .cs-chevron { opacity: 0.65; }`}</style>
      <button
        type="button"
        className="cs-header"
        onClick={() => setOpen((p) => !p)}
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
