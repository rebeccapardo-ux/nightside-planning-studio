import Link from 'next/link'

// "Preview & Export" entry point — a plain Link to the self-sufficient export
// page (which owns the summary/full PDF generation). Rendered in the header of
// both the Areas of Planning and Your materials pages. Absolutely positioned to
// sit a fixed distance from the floating notepad; `mobile-sticky-export` /
// `plan-export-bar` carry their responsive behaviour from global CSS.
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
          background: '#DB5835', color: '#F8F4EB',
          textDecoration: 'none', border: 'none', whiteSpace: 'nowrap',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#F8F4EB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1.5 10.5h10" stroke="#F8F4EB" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="hidden md:inline">Preview &amp; </span>Export
      </Link>
    </div>
  )
}
