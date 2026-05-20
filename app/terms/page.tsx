'use client'
import { useState } from 'react'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const EFFECTIVE_DATE = 'May 20, 2026'
const LAST_UPDATED   = 'May 20, 2026'

const p:  React.CSSProperties = { fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, margin: '0 0 16px' }
const h3: React.CSSProperties = { fontFamily: hv, fontSize: 16, fontWeight: 600, color: '#130426', margin: '24px 0 8px' }
const ul: React.CSSProperties = { listStyleType: 'disc', padding: '0 0 0 24px', margin: '0 0 16px' }
const li: React.CSSProperties = { fontFamily: hv, fontSize: 16, color: '#130426', lineHeight: 1.75, marginBottom: 8 }
const a:  React.CSSProperties = { color: '#130426', textDecoration: 'underline' }

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease', flexShrink: 0 }}
    >
      <path d="M3 6L8 11L13 6" stroke="rgba(19,4,38,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const divider = '1px solid rgba(19,4,38,0.18)'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ borderTop: divider, marginTop: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '20px 0 16px', textAlign: 'left', gap: 12,
        }}
      >
        <span style={{ fontFamily: hv, fontSize: 20, fontWeight: 600, color: '#130426' }}>{title}</span>
        <Chevron open={open} />
      </button>
      {open && <div style={{ paddingBottom: 24 }}>{children}</div>}
    </div>
  )
}

function StaticSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: divider, marginTop: 8 }}>
      <div style={{ padding: '20px 0 16px' }}>
        <span style={{ fontFamily: hv, fontSize: 20, fontWeight: 600, color: '#130426' }}>{title}</span>
      </div>
      <div style={{ paddingBottom: 24 }}>{children}</div>
    </div>
  )
}

export default function TermsPage() {
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh', padding: '64px 24px 96px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <h1 style={{ fontFamily: hv, fontSize: 32, fontWeight: 600, color: '#130426', margin: '0 0 8px' }}>
          Terms of Service
        </h1>
        <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.55)', lineHeight: 1.6, margin: '0 0 40px' }}>
          Effective date: {EFFECTIVE_DATE}<br />
          Last updated: {LAST_UPDATED}
        </p>

        {/* ── About these terms ── */}
        <StaticSection title="About these terms">
          <p style={p}>
            These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between you and The Nightside Inc. (&ldquo;The Nightside,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) regarding your use of The Nightside Planning Studio (the &ldquo;platform&rdquo;). By creating an account or using the platform, you agree to these Terms.
          </p>
          <p style={p}>
            If you don&apos;t agree to these Terms, please don&apos;t use the platform.
          </p>
          <p style={{ ...p, margin: 0 }}>
            We&apos;ve written these in plain language because you should be able to read and understand what you&apos;re agreeing to. If anything isn&apos;t clear, contact us at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>.
          </p>
        </StaticSection>

        {/* ── What the platform is ── */}
        <StaticSection title="What the platform is">
          <p style={{ ...p, margin: 0 }}>
            The Nightside Planning Studio is an end-of-life planning platform. It helps you reflect on, organize, and document your wishes and information related to end-of-life matters — including your wishes for your body, your funeral and ceremony, your care, your finances, your legacy, and other practical and personal details.
          </p>
        </StaticSection>

        {/* ── What the platform is not ── */}
        <Section title="What the platform is not">
          <p style={p}>
            The platform is a planning and organizational tool. It does not produce legally binding documents and is not a substitute for legal, medical, financial, or other professional advice.
          </p>
          <p style={p}>Specifically:</p>
          <ul style={ul}>
            <li style={li}><strong style={{ fontWeight: 600 }}>Not legal documents.</strong> The wishes documents, plans, and other content you create on the platform are not a legal will, a legally binding advance directive, a legally binding power of attorney, or a legal contract. If you want legally binding documents for end-of-life decisions, you need to work with a lawyer in your jurisdiction.</li>
            <li style={li}><strong style={{ fontWeight: 600 }}>Not medical advice.</strong> Information on the platform about healthcare options is for general informational purposes only. It is not medical advice and does not establish a clinician-patient relationship.</li>
            <li style={li}><strong style={{ fontWeight: 600 }}>Not financial advice.</strong> Information on the platform about financial planning is for general informational purposes only. It is not financial advice and does not establish a financial advisor-client relationship.</li>
            <li style={{ ...li, marginBottom: 0 }}><strong style={{ fontWeight: 600 }}>Not legal designations.</strong> Designating a Legacy Contact on the platform does not give that person any legal authority over your estate, healthcare decisions, or any other matter. It only authorizes us to release your planning materials to them under the conditions described in our Privacy Policy.</li>
          </ul>
        </Section>

        {/* ── Eligibility ── */}
        <StaticSection title="Eligibility">
          <p style={p}>
            You must be 18 years of age or older to use the platform.
          </p>
          <p style={{ ...p, margin: 0 }}>
            By creating an account, you confirm that you are at least 18 years old.
          </p>
        </StaticSection>

        {/* ── Your account ── */}
        <StaticSection title="Your account">
          <p style={p}>
            You&apos;re responsible for keeping your account information accurate and your password secure. You&apos;re responsible for activity that happens under your account. If you suspect unauthorized access, contact us at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>.
          </p>
          <p style={{ ...p, margin: 0 }}>
            You can update your account information and delete your account at any time through your account settings. Deletion is immediate and permanently removes your content from our database, subject to our backup retention schedule described in the Privacy Policy.
          </p>
        </StaticSection>

        {/* ── Your content ── */}
        <Section title="Your content">
          <p style={p}>
            You own everything you create on the platform — your documents, your reflections, your activity outputs, your notes, your voice recordings, and any other content you enter or upload. We don&apos;t claim any ownership rights over your content.
          </p>
          <p style={p}>
            You grant us a limited license to store, process, and display your content for the sole purpose of providing the platform to you. This license ends when you delete your content or your account.
          </p>
          <p style={p}>You&apos;re responsible for the content you create. Specifically:</p>
          <ul style={ul}>
            <li style={li}><strong style={{ fontWeight: 600 }}>You&apos;re responsible for the accuracy of your content.</strong> We don&apos;t verify what you enter. If your wishes documents contain inaccurate information about your accounts, contacts, or preferences, that&apos;s your responsibility to correct.</li>
            <li style={li}><strong style={{ fontWeight: 600 }}>You&apos;re responsible for content involving others.</strong> If you record voice notes that include other people, name people in your contacts or wishes documents, or otherwise include information about others, you&apos;re responsible for ensuring you have the appropriate basis to do so.</li>
            <li style={{ ...li, marginBottom: 0 }}><strong style={{ fontWeight: 600 }}>You&apos;re responsible for your designations.</strong> When you designate a Legacy Contact, you&apos;re authorizing us to contact that person on your behalf under the conditions in the Privacy Policy. You&apos;re responsible for ensuring the contact information is accurate and the person is willing to be designated.</li>
          </ul>
        </Section>

        {/* ── Intellectual property ── */}
        <Section title="Intellectual property">
          <p style={p}>
            <strong style={{ fontWeight: 600 }}>The platform&apos;s content.</strong> The platform itself — including its design, code, written content, branding, and trademarks — belongs to The Nightside Inc. and is protected by copyright and other intellectual property laws. You may use the platform for your personal end-of-life planning. You may not copy, distribute, modify, or use any part of the platform for commercial purposes without our written permission.
          </p>
          <p style={p}>
            <strong style={{ fontWeight: 600 }}>Your content.</strong> As described in the &ldquo;Your content&rdquo; section above, you retain ownership of everything you create on the platform. You grant us a limited license to store, process, and display your content solely for the purpose of providing the platform to you.
          </p>
          <p style={{ ...p, margin: 0 }}>
            <strong style={{ fontWeight: 600 }}>Copyright concerns.</strong> If you believe content on the platform infringes your copyright, contact us at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>{' '}
            with details of the alleged infringement. We will respond according to applicable Canadian copyright law, including forwarding notices to users as required.
          </p>
        </Section>

        {/* ── Death doula services ── */}
        <StaticSection title="Death doula services">
          <p style={{ ...p, margin: 0 }}>
            The platform is operated by The Nightside Inc. Death doula services are offered separately by Rebecca Pardo, founder of The Nightside Inc. Death doula services are not part of the platform and are governed by separate agreements. Using the platform does not entitle you to doula services, and these Terms do not govern any doula relationship.
          </p>
        </StaticSection>

        {/* ── What you can't do ── */}
        <Section title="What you can't do">
          <p style={p}>When using the platform, you agree not to:</p>
          <ul style={ul}>
            {[
              'Use the platform for any unlawful purpose',
              'Attempt to access another user\'s account or data',
              'Attempt to disrupt, damage, or interfere with the platform\'s operation',
              'Use automated tools to scrape, crawl, or extract data from the platform',
              'Reverse-engineer, decompile, or attempt to derive the source code of the platform',
              'Upload content that violates the rights of others, including intellectual property rights or privacy rights',
              'Upload malicious code, viruses, or other harmful software',
              'Impersonate another person or misrepresent your identity',
              'Use the platform to harass, threaten, or harm others',
            ].map((item) => (
              <li key={item} style={{ ...li, marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
          <p style={{ ...p, margin: 0 }}>
            We may suspend or terminate accounts that violate these conditions.
          </p>
        </Section>

        {/* ── Payment ── */}
        <StaticSection title="Payment">
          <p style={p}>
            Fees for use of the platform, refund policies, and billing details will be communicated to you at signup. By signing up, you agree to the fees in effect at that time.
          </p>
          <p style={{ ...p, margin: 0, fontStyle: 'italic', color: 'rgba(19,4,38,0.6)' }}>
            [Detailed payment terms will be added when the payment system is implemented.]
          </p>
        </StaticSection>

        {/* ── What happens if you die ── */}
        <StaticSection title="What happens if you die">
          <p style={p}>
            When you sign up, you designate a Legacy Contact. By doing so, you authorize The Nightside Inc. to release your designated planning materials to that contact according to the process described in our Privacy Policy if you die. This authorization is part of your agreement to these Terms.
          </p>
          <p style={{ ...p, margin: 0 }}>
            Full details of how this works — what gets released, how the Legacy Contact verifies your death, what you can choose to include — are in our{' '}
            <a href="/privacy" style={a}>Privacy Policy</a>.
          </p>
        </StaticSection>

        {/* ── Service availability ── */}
        <StaticSection title="Service availability">
          <p style={p}>
            We work to keep the platform available, but we don&apos;t guarantee specific uptime, performance, or availability. The platform may be temporarily unavailable for maintenance, updates, or due to circumstances beyond our control.
          </p>
          <p style={{ ...p, margin: 0 }}>
            We may modify or discontinue features of the platform. If we discontinue the platform entirely, we will give you reasonable advance notice and ensure you have an opportunity to export your content.
          </p>
        </StaticSection>

        {/* ── No warranties ── */}
        <StaticSection title="No warranties">
          <p style={p}>
            The platform is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We make no warranties — express or implied — about the platform&apos;s reliability, accuracy, suitability for any particular purpose, or non-infringement.
          </p>
          <p style={{ ...p, margin: 0 }}>
            This doesn&apos;t limit any rights you have under applicable consumer protection law that cannot be waived.
          </p>
        </StaticSection>

        {/* ── Limitation of liability ── */}
        <Section title="Limitation of liability">
          <p style={p}>To the extent permitted by law, The Nightside Inc. is not liable for:</p>
          <ul style={ul}>
            {[
              'Loss of data, content, or business',
              'Indirect, incidental, consequential, special, or punitive damages',
              'Any legal or financial consequences of decisions you make based on your use of the platform',
              'The actions, decisions, or behavior of any Legacy Contact you designate',
              'The legal validity, completeness, or effectiveness of any planning materials you create',
            ].map((item) => (
              <li key={item} style={{ ...li, marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
          <p style={p}>
            If you have a claim against us, our total liability is limited to the amount you paid us for the platform in the twelve months before the claim arose.
          </p>
          <p style={{ ...p, margin: 0 }}>
            This doesn&apos;t limit any rights you have under applicable consumer protection law that cannot be waived.
          </p>
        </Section>

        {/* ── Termination ── */}
        <Section title="Termination">
          <p style={p}>
            You can terminate your account at any time by deleting it through your account settings. Deletion is permanent.
          </p>
          <p style={p}>
            We may suspend or terminate your account if you violate these Terms, if your use of the platform causes harm to other users or to us, or if we discontinue the platform.
          </p>
          <p style={p}>
            If we terminate your account other than for cause (e.g., we discontinue the platform), we will give you reasonable notice and ensure you have an opportunity to export your content.
          </p>
          <p style={{ ...p, margin: 0 }}>
            After termination, the sections of these Terms that by their nature should survive will survive — including the sections on Your Content, Intellectual Property, Limitation of Liability, and Governing Law.
          </p>
        </Section>

        {/* ── Governing law ── */}
        <StaticSection title="Governing law">
          <p style={{ ...p, margin: 0 }}>
            These Terms are governed by the laws of the Province of Ontario, Canada, and the federal laws of Canada applicable in Ontario. Any disputes arising from these Terms or your use of the platform will be resolved in the courts of Ontario.
          </p>
        </StaticSection>

        {/* ── Changes to these terms ── */}
        <StaticSection title="Changes to these terms">
          <p style={p}>
            We may update these Terms from time to time. If we do, we&apos;ll update the &ldquo;Last updated&rdquo; date at the top. For material changes — changes that meaningfully affect your rights or obligations — we&apos;ll notify you by email before the changes take effect.
          </p>
          <p style={{ ...p, margin: 0 }}>
            If you don&apos;t agree to the changes, you can stop using the platform and delete your account. Continued use of the platform after the changes take effect constitutes acceptance of the updated Terms.
          </p>
        </StaticSection>

        {/* ── Contact ── */}
        <StaticSection title="Contact">
          <p style={p}>
            If you have questions about these Terms, contact us at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>.
          </p>
          <p style={{ ...p, margin: 0 }}>
            The current version of these Terms is always available at{' '}
            <a href="/terms" style={a}>thenightside.net/terms</a>{' '}
            <span style={{ color: 'rgba(19,4,38,0.45)', fontSize: 14 }}>[URL to be confirmed at production launch]</span>.
          </p>
        </StaticSection>

        <div style={{ borderTop: divider, marginTop: 16, paddingTop: 24 }}>
          <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.45)', margin: 0, lineHeight: 1.6 }}>
            Effective {EFFECTIVE_DATE} · Last updated {LAST_UPDATED}
          </p>
        </div>

      </div>
    </div>
  )
}
