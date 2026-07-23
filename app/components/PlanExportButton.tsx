import Link from 'next/link'

// "Preview & Export" entry point — a plain Link to the self-sufficient export
// page (which owns the summary/full PDF generation). Rendered in the Your materials
// page header. Absolutely positioned to sit a fixed distance from the floating
// notepad; `mobile-sticky-export` / `plan-export-bar` carry their responsive
// behaviour from global CSS; the cream hover lives in the Your-materials <style>.
//
// Neutral-utility treatment: cream fill + midnight ink/icon, matching the banner-sited export
// buttons (doc/activity). This one sits on a CREAM body (not a colored banner), so it carries a
// visible border for definition — the on-banner ones don't need one. Pairs with the midnight
// notepad as the two constant "global utility" controls; color is reserved for accents.
export default function PlanExportButton() {
  return (
    <div className="plan-export-bar" style={{ position: 'absolute', top: 20, right: 148 }}>
      <Link
        href="/app/materials/export"
        className="plan-export-btn mobile-sticky-export"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          borderRadius: 999, padding: '10px 20px',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 600,
          background: '#F8F4EB', color: '#130426',
          textDecoration: 'none', border: '1.5px solid rgba(19,4,38,0.42)', whiteSpace: 'nowrap',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1.5 10.5h10" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="hidden md:inline">Preview &amp; </span>Export
      </Link>
    </div>
  )
}
