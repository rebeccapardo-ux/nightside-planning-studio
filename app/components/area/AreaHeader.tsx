'use client'

import Link from 'next/link'
import { useSectionCollapse } from './useSectionCollapse'

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Area-page header: navy band (breadcrumb + title + intro) and, beneath it, the
// full-width "Overview" band. The band is a peer section — its "Overview" header
// matches the page's other section headers (Relevant Activities / Plan), with a chevron
// toggle beside it. Light-lavender, full-bleed (SIBLING of the navy block). Collapsed →
// header only; expanded → header + the content (≤760px reading width). Default state:
// EXPANDED on first visit to this area, then remembers the user's choice (shared model
// with the other sections — see useSectionCollapse).
export default function AreaHeader({
  slug, title, intro, children,
}: { slug: string; title: string; intro: string; children: React.ReactNode }) {
  const [open, toggle] = useSectionCollapse(`nightside.areaSection.${slug}.overview`)

  return (
    <>
      <div style={{ background: 'radial-gradient(circle at 20% 20%, #1a0535 0%, #130426 70%)' }}>
        <div className="max-w-6xl mx-auto pt-16 md:pt-6" style={{ paddingLeft: 40, paddingRight: 40 }}>
          <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            <Link href="/app" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Plan by area</Link>
            {' / '}{title}
          </p>
        </div>
        <div className="max-w-6xl mx-auto" style={{ padding: '12px 40px 40px' }}>
          <h1 className="ns-title-activity text-white">{title}</h1>
          <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', maxWidth: 640, margin: '16px 0 0' }}>{intro}</p>
        </div>
      </div>

      {/* Overview band — a peer section ("Overview" header matching the page's other
          section headers, toggled by a chevron exactly like them). Light-lavender,
          full-bleed (sibling of the navy block). */}
      {children && (
        <div style={{ background: '#ECE7F7', borderTop: '1px solid rgba(19,4,38,0.12)' }}>
          <style>{`.ah-header:hover .ah-chevron { opacity: 0.65; }`}</style>
          <div className="max-w-6xl mx-auto" style={{ padding: open ? '28px 40px 48px' : '24px 40px' }}>
            <button
              type="button"
              className="ah-header"
              onClick={toggle}
              aria-expanded={open}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
            >
              <h2 style={{ fontFamily: apfel, fontSize: 30, fontWeight: 600, color: '#130426', margin: 0 }}>Overview</h2>
              <span className="ah-chevron" style={{ display: 'inline-flex', transition: 'opacity 150ms' }}>
                <Chevron open={open} />
              </span>
            </button>
            {open && <div style={{ maxWidth: 760, marginTop: 20 }}>{children}</div>}
          </div>
        </div>
      )}
    </>
  )
}

// Matches the chevron used by CollapsibleSection (Relevant activities / Plan) so the
// Overview section toggles identically.
function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>
      <path d="M4 6l4 4 4-4" stroke="#130426" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
