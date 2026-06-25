import Link from 'next/link'

export type ContinuePlanningDoc = { label: string; href: string }

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Shared "Continue in Your Plan" panel for the Learn area pages (extracted from
// six duplicated copies). Primary action is "Track your progress →" (the area's
// domain page); relevant platform documents follow under a sub-header. When an
// area has no relevant document (Wills & Estates), the docs section is omitted.
export default function ContinuePlanningPanel({
  domainHref,
  documents = [],
}: {
  domainHref: string
  documents?: ContinuePlanningDoc[]
}) {
  return (
    <div style={{ marginTop: 24, maxWidth: 520 }}>
      <div style={{ background: '#DBD2F6', borderRadius: 24, padding: 32 }}>
        {/* Header is sized just above the body items (21 vs 18) — a recognizable panel
            title, not a major-section banner. No rule beneath: the panel holds two
            small items, so a divider would over-emphasize it. */}
        <h3 style={{ fontFamily: apfel, fontSize: 21, fontWeight: 600, lineHeight: 1.2, color: '#130426', margin: '0 0 14px 0' }}>
          Continue in Your Plan
        </h3>

        {/* "Track your progress" and "Relevant documents" are visual sisters —
            same 18px bold; the role differs only by styling: the progress link is
            navy + underlined + clickable, the sub-header is dark + plain. */}
        <Link
          href={domainHref}
          className="hover:opacity-75 transition-opacity"
          style={{ fontFamily: hv, fontSize: 18, fontWeight: 700, color: '#2C3777', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Track your progress →
        </Link>

        {documents.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 700, color: '#130426', margin: '0 0 12px 0' }}>
              Relevant documents
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 0 16px' }}>
              {documents.map((doc) => (
                <li key={doc.href} style={{ marginBottom: 10 }}>
                  <Link
                    href={doc.href}
                    className="hover:opacity-75 transition-opacity"
                    style={{ fontFamily: hv, fontSize: 16, color: '#2C3777', textDecoration: 'underline', textUnderlineOffset: 3 }}
                  >
                    {doc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
