// Healthcare Learn content for the area-page "See more" band — the existing
// the original Learn page copy (Why this matters · Choosing your substitute
// decision-maker), reflowed from the Learn page's 2-column layout into the band's
// single 760px reading column, rendered static (no scroll-reveal). Static JSX, so it
// passes cleanly as children from the server area page into the client AreaHeader.
//
// DIVERGENCE FROM MOCKUP: the mockup's band shows 5 rewritten sections (Why this
// matters · Substitute decision-makers for care · What documents are involved · The
// limits of advance directives · Revisiting your wishes). Per the brief ("existing
// content from that area's Learn page") this uses the current 2-section copy. Swap to
// the mockup's expanded copy if that's the intended content.

const apfel = "'Apfel Grotezk', sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const para: React.CSSProperties = { fontFamily: hv, fontSize: 17, lineHeight: 1.65, color: '#130426', margin: '0 0 18px' }

export default function HealthcareLearnContent() {
  return (
    <div>
      {/* No "Why this matters" heading — this content sits under the "The basics" sub-section,
          which already labels it (and the plain "Overview" fallback for provinces without a
          summary yet reads fine without it too). */}
      <p style={para}>Without clear communication, your loved ones and care providers may face painful choices, uncertainty, and conflict.</p>
      <p style={para}>Many people approach advance care planning by listing treatments they would or wouldn&rsquo;t want. While that can be helpful, it has limits — it&rsquo;s hard to predict how you&rsquo;d feel in a situation you&rsquo;ve never been in, and <strong style={{ fontWeight: 600 }}>ableist assumptions about what life with illness or disability might be like can distort decisions.</strong></p>
      <p style={para}>For example, someone might say &ldquo;no machines&rdquo; without knowing the range of options or experiences, or assume they wouldn&rsquo;t want to live without being able to speak, without realizing what assistive tools exist.</p>
      <p style={{ ...para, marginBottom: 36 }}>By reflecting on your values and priorities, you can give your substitute decision-maker the context they need to make thoughtful decisions on your behalf — even in unexpected situations.</p>

      <div style={{ background: 'rgba(187,171,244,0.18)', border: '1px solid rgba(19,4,38,0.1)', borderRadius: 16, padding: 28 }}>
        <h3 style={{ fontFamily: apfel, fontSize: 19, fontWeight: 600, color: '#130426', margin: '0 0 12px' }}>Choosing your substitute decision-maker</h3>
        <p style={{ ...para, marginBottom: 16 }}>If someone had to speak on your behalf, what would you want them to understand?</p>
        <ul style={{ listStyle: 'disc', paddingLeft: 22, margin: 0 }}>
          <li style={{ ...para, marginBottom: 8 }}>Do they understand my values?</li>
          <li style={{ ...para, marginBottom: 8 }}>Can I trust them to speak up for me?</li>
          <li style={{ ...para, marginBottom: 0 }}>Are they able to handle tough conversations under pressure?</li>
        </ul>
      </div>
    </div>
  )
}
