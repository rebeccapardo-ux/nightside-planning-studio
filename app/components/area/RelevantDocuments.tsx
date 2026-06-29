import Link from 'next/link'
import { DOCUMENT_TYPE_META, type DocumentType } from '@/lib/content-metadata'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'Apfel Grotezk', sans-serif"

// Relevant Documents — the bordered-Sunrise callout at the top of an area page's
// Plan-section left column (above Planning Progress). Lists the platform documents
// relevant to this area as prominent linked entries (labels + hrefs from
// DOCUMENT_TYPE_META — never re-hardcoded). Pure presentational: the area route
// (server) renders it into AreaPlanSection's `topSlot`. Areas with no relevant
// document don't render this at all (the route passes null).

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke="#E0582E" strokeWidth="1.25" strokeLinejoin="round" fill="none" />
      <path d="M10 1v3h3" stroke="#E0582E" strokeWidth="1.25" strokeLinejoin="round" fill="none" />
      <path d="M5.5 7.5h5M5.5 10h5" stroke="#E0582E" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

export default function RelevantDocuments({ documents }: { documents: DocumentType[] }) {
  if (documents.length === 0) return null
  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid #F29836', borderRadius: 16, padding: '20px 22px' }}>
      <style>{`.rd-row:hover .rd-label { color: #1a2255; } .rd-row:hover { background: rgba(240,150,54,0.06); }`}</style>
      <h3 style={{ fontFamily: apfel, fontSize: 18, fontWeight: 600, color: '#130426', margin: '0 0 14px' }}>Relevant Documents</h3>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {documents.map((code, i) => {
          const meta = DOCUMENT_TYPE_META[code]
          return (
            <Link
              key={code}
              href={meta.href}
              className="rd-row"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 8px', margin: '0 -8px', borderRadius: 8, textDecoration: 'none',
                borderTop: i === 0 ? 'none' : '1px solid rgba(19,4,38,0.07)',
              }}
            >
              <DocIcon />
              <span className="rd-label" style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#2C3777', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                {meta.label}
              </span>
              <span aria-hidden="true" style={{ marginLeft: 'auto', fontFamily: hv, fontSize: 15, color: '#2C3777' }}>→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
