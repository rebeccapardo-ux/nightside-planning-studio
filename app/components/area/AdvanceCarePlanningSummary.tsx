// Renders a province's advance-care-planning summary (from lib/healthcare-summaries) inside
// the Healthcare "What you need to know" section. Server component: static data + external
// source links, no interactivity of its own (the collapse is the sub-section around it).
//
// The summary is EVIDENTIARY reading, distinct from the Resources section below it: inline
// <n> markers render as small, quiet numbered source links for verifying a specific claim —
// deliberately subordinate, NOT the browsable action block that Resources is.
//
// Markdown handled: **bold** key terms, *italic*, and <n> source markers. Matches the small
// inline "[source]" citation style used elsewhere (e.g. LegacyLearnContent), numbered.

import Link from 'next/link'
import type { AcpSummary, AcpSource } from '@/lib/healthcare-summaries'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const takeawayStyle: React.CSSProperties = { fontFamily: hv, fontSize: 18, fontWeight: 600, color: '#130426', lineHeight: 1.5, margin: '0 0 20px', maxWidth: 680 }
const bodyStyle: React.CSSProperties = { fontFamily: hv, fontSize: 17, lineHeight: 1.65, color: '#130426', margin: '0 0 16px', maxWidth: 680 }
// Province attribution — same treatment/copy as the Resources section, so the two read as one
// personalized system. (Separate sections, not adjacent, so showing it in each is not a repeat.)
const noteStyle: React.CSSProperties = { fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.6)', lineHeight: 1.5, margin: '0 0 18px' }

// Small, quiet inline citation link — subordinate, for verifying one claim.
function SourceLink({ n, url }: { n: number; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="acp-source"
      style={{ fontSize: 12.5, color: 'rgba(19,4,38,0.55)', textDecoration: 'underline', whiteSpace: 'nowrap', margin: '0 1px', verticalAlign: '1px' }}
    >
      [{n}]
    </a>
  )
}

// Split a run of text into React nodes, resolving **bold**, *italic*, and <n> markers.
// Order matters: **…** is matched before *…* (both in one alternation, longest-first).
function renderInline(text: string, sources: AcpSource[], keyBase: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|<\d+>)/g)
    .filter((tok) => tok !== '')
    .map((tok, i) => {
      const key = `${keyBase}-${i}`
      if (tok.startsWith('**') && tok.endsWith('**')) {
        return <strong key={key} style={{ fontWeight: 600 }}>{tok.slice(2, -2)}</strong>
      }
      if (tok.length > 1 && tok.startsWith('*') && tok.endsWith('*')) {
        return <em key={key}>{tok.slice(1, -1)}</em>
      }
      const m = tok.match(/^<(\d+)>$/)
      if (m) {
        const n = Number(m[1])
        const src = sources.find((s) => s.n === n)
        // No linkable URL (e.g. a "guidance" reference with no page) → omit the marker.
        return src && src.url ? <SourceLink key={key} n={n} url={src.url} /> : null
      }
      return <span key={key}>{tok}</span>
    })
}

export default function AdvanceCarePlanningSummary({ summary }: { summary: AcpSummary }) {
  const paragraphs = summary.body.split(/\n{2,}/)
  return (
    <div>
      <style>{`.acp-source:hover { color: #2C3777; }`}</style>
      <p style={noteStyle}>
        Based on the province you set at signup. To change it, visit{' '}
        <Link href="/app/account" style={{ color: '#2C3777', textDecoration: 'underline' }}>My Account</Link>.
      </p>
      {/* Takeaway — the scannable bold lead; no source marker. */}
      <p style={takeawayStyle}>{renderInline(summary.takeaway, summary.sources, 'tk')}</p>
      {paragraphs.map((para, i) => (
        <p key={i} style={i === paragraphs.length - 1 ? { ...bodyStyle, marginBottom: 0 } : bodyStyle}>
          {renderInline(para, summary.sources, `p${i}`)}
        </p>
      ))}
    </div>
  )
}
