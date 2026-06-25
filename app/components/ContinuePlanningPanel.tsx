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
    <div style={{ marginTop: 24, maxWidth: 760 }}>
      <div style={{ background: '#DBD2F6', borderRadius: 24, padding: 36 }}>
        <h3 style={{ fontFamily: apfel, fontSize: 28, fontWeight: 600, lineHeight: 1.2, color: '#130426', margin: '0 0 24px 0' }}>
          Continue in Your Plan
        </h3>

        {/* Primary action — button-weight, navy on cream */}
        <Link
          href={domainHref}
          className="inline-block hover:opacity-90 transition-opacity"
          style={{ fontFamily: hv, fontSize: 16, fontWeight: 600, padding: '16px 28px', borderRadius: 999, background: '#2C3777', color: '#F8F4EB', textDecoration: 'none' }}
        >
          Track your progress →
        </Link>

        {documents.length > 0 && (
          <div style={{ marginTop: 36 }}>
            {/* Sub-header — bold, smaller than the panel header, heavier than the
                doc links (which are navy/underlined) so the hierarchy is clear. */}
            <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 700, color: '#130426', margin: '0 0 14px 0' }}>
              Relevant documents
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
