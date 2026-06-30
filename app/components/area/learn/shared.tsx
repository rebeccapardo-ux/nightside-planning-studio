import type React from 'react'

// Shared styles + building blocks for the per-area Overview band content components
// (HealthcareLearnContent, DeathcareLearnContent, …). Each component reflows its
// existing /app/learn/[area] copy into the band's single 760px reading column.
export const apfel = "'Apfel Grotezk', sans-serif"
export const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Body paragraph.
export const para: React.CSSProperties = { fontFamily: hv, fontSize: 17, lineHeight: 1.65, color: '#130426', margin: '0 0 18px' }
// Sub-subheader within the Overview section — clearly subordinate to the section's
// "Overview" header (30/600, rendered by AreaHeader).
export const heading: React.CSSProperties = { fontFamily: apfel, fontSize: 21, fontWeight: 600, lineHeight: 1.2, color: '#130426', margin: '0 0 14px' }

// Province-specific / external resources callout — carried over from each Learn page's
// "Next steps" section. White card with the Sunrise CTA so it reads as a distinct
// resource callout against the lavender band. (Legacy has no such card → omitted there.)
export function ResourcesPanel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.1)', borderRadius: 16, padding: '26px 28px', marginTop: 32 }}>
      <h3 style={{ fontFamily: apfel, fontSize: 19, fontWeight: 600, color: '#130426', margin: '0 0 10px' }}>{title}</h3>
      <p style={{ ...para, fontSize: 16, marginBottom: 20 }}>{children}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block hover:opacity-90 transition-opacity"
        style={{ background: '#DB5835', color: '#130426', fontFamily: hv, fontSize: 15, fontWeight: 500, padding: '12px 22px', borderRadius: 999, textDecoration: 'none' }}
      >
        View resources →
      </a>
    </div>
  )
}

// A bulleted list where each item is "<strong>term:</strong> detail" — used by several
// area Overviews (Wills estate-plan list, Personal Admin coverage, Ritual equity note).
export function TermList({ items }: { items: { term: string; detail: string }[] }) {
  return (
    <ul style={{ listStyle: 'disc', paddingLeft: 22, margin: 0 }}>
      {items.map((it, i) => (
        <li key={i} style={{ ...para, marginBottom: i === items.length - 1 ? 0 : 8 }}>
          <strong style={{ fontWeight: 600 }}>{it.term}:</strong> {it.detail}
        </li>
      ))}
    </ul>
  )
}
