'use client'
import { useState } from 'react'

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const EFFECTIVE_DATE = 'May 20, 2026'
const LAST_UPDATED   = 'May 24, 2026'

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

export default function PrivacyPage() {
  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh', padding: '64px 24px 96px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <h1 style={{ fontFamily: hv, fontSize: 32, fontWeight: 600, color: '#130426', margin: '0 0 8px' }}>
          Privacy Policy
        </h1>
        <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.55)', lineHeight: 1.6, margin: '0 0 40px' }}>
          Effective date: {EFFECTIVE_DATE}<br />
          Last updated: {LAST_UPDATED}
        </p>

        {/* ── About this policy ── */}
        <StaticSection title="About this policy">
          <p style={p}>
            The Nightside Planning Studio is an end-of-life planning platform operated by The Nightside Inc. in Canada. This policy explains what personal information we collect from you, how we store and protect it, who we share it with, and what your rights are.
          </p>
          <p style={{ ...p, margin: 0 }}>
            We&apos;ve written this in plain language because we believe you should be able to read and understand what we do with your information. If anything here isn&apos;t clear, contact us at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>.
          </p>
        </StaticSection>

        {/* ── What we collect ── */}
        <Section title="What we collect">
          <p style={p}>When you use The Nightside Planning Studio, we collect the following:</p>
          <ul style={ul}>
            <li style={li}><strong style={{ fontWeight: 600 }}>Account information:</strong> your first name, last name, email address, password (stored as a secure hash, never as plain text), and province of residence.</li>
            <li style={li}><strong style={{ fontWeight: 600 }}>Content you create:</strong> everything you enter into the platform, including your wishes documents, practical planning documents, reflections, activity outputs (such as your Values Ranking, Fears Ranking, and Legacy Map), notes, and voice recordings (including their transcriptions).</li>
            <li style={li}><strong style={{ fontWeight: 600 }}>Legacy Contact information:</strong> the name, email, and relationship of the person (or people) you designate as your Legacy Contact, plus any personal message you choose to write for them.</li>
            <li style={{ ...li, marginBottom: 0 }}><strong style={{ fontWeight: 600 }}>Usage and technical information:</strong> account creation date, last sign-in date, completion status of your documents and activities, last-edited timestamps, and technical information such as your IP address and browser type that is captured automatically when you use the platform. We also maintain an internal event log to understand how users move through the platform — for example, when an account is created, when key planning milestones are reached, or when important features are used. This log is used solely to understand and improve the platform; it is not shared or sold.</li>
          </ul>
          <p style={{ ...p, margin: 0 }}>
            <strong style={{ fontWeight: 600 }}>What we don&apos;t store:</strong> certain fields in your documents are designed to be added at the moment you export your plan rather than saved to the platform. These include your Social Insurance Number, health card number, financial account numbers, passwords, PINs, and other access details. These fields exist for your export, but the actual values are never stored on our servers.
          </p>
        </Section>

        {/* ── Why we collect it ── */}
        <Section title="Why we collect it">
          <p style={p}>We collect this information for the following purposes:</p>
          <ul style={ul}>
            {[
              'To create and maintain your account',
              'To authenticate you when you sign in',
              'To save your work and make it accessible to you across sessions',
              'To enable you to export your plan',
              'To send you essential emails related to your account (email confirmation, password reset)',
              'To release your designated planning materials to your Legacy Contact if you die',
            ].map((item) => (
              <li key={item} style={{ ...li, marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
          <p style={{ ...p, margin: 0 }}>
            We do not use your information for marketing, advertising, profiling, or any other purpose beyond providing you with the planning platform.
          </p>
        </Section>

        {/* ── Who we share it with ── */}
        <Section title="Who we share it with">
          <p style={p}>
            We use a small number of third-party services to operate the platform. These services receive only the information necessary to provide their function, and they are contractually required to protect your data.
          </p>
          <ul style={ul}>
            <li style={li}><strong style={{ fontWeight: 600 }}>Supabase</strong> stores your account information and content. Supabase is a database and authentication provider. Your data is stored on Supabase&apos;s Canadian servers (ca-central-1 region).</li>
            <li style={li}><strong style={{ fontWeight: 600 }}>Resend</strong> sends emails on behalf of the platform (account confirmations, password resets, and notifications to your Legacy Contact at the time of designation). Resend processes emails through US-based infrastructure.</li>
            <li style={li}><strong style={{ fontWeight: 600 }}>Vercel</strong> hosts the platform itself. Vercel may process technical information such as IP addresses for hosting and security purposes. Vercel&apos;s infrastructure is US-based.</li>
            <li style={{ ...li, marginBottom: 0 }}><strong style={{ fontWeight: 600 }}>Plausible Analytics</strong> measures aggregate traffic to the platform — things like how many people visit, what pages they view, and where they come from. Plausible does not use cookies, does not track individuals, and does not store personal data. Plausible is GDPR and PIPEDA compliant, and their infrastructure is EU-based.</li>
          </ul>
          <p style={{ ...p, margin: '16px 0 0' }}>
            We do not sell your information. We do not share your information with third parties for marketing, advertising, or any commercial purpose. We do not use third-party analytics tools that track you across the web.
          </p>

          <h3 style={h3}>A note on cross-border data transfers</h3>
          <p style={{ ...p, margin: 0 }}>
            Some of the services we use are operated outside of Canada. When your data is processed by services in other countries, it may be subject to the laws of those countries — including laws that allow government access to data under different terms than Canadian law. We choose providers that maintain strong security and contractual protections, and we limit cross-border transfers to what is necessary to operate the platform. If you have questions about cross-border transfers, contact our privacy officer at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>.
          </p>
        </Section>

        {/* ── How we protect it ── */}
        <Section title="How we protect it">
          <p style={p}>We take the following measures to protect your information:</p>
          <ul style={ul}>
            <li style={li}>Your content is encrypted both when it&apos;s traveling between your device and the platform, and when it&apos;s stored on our servers</li>
            <li style={li}>Your password is stored as a secure hash, never as plain text</li>
            <li style={{ ...li, marginBottom: 0 }}>Your account is accessible only through your authenticated session, using row-level security policies that prevent other users from accessing your data</li>
          </ul>
          <p style={{ ...p, margin: '16px 0 16px' }}>
            We do not access your content in the normal course of operating the platform. There are limited circumstances where access may be necessary — to help you troubleshoot a problem you&apos;ve reported, to investigate a security incident, to comply with a legal order, or to perform necessary database maintenance. We minimize this access and treat any content we encounter with care.
          </p>
          <p style={{ ...p, margin: 0 }}>
            No security measure is perfect. While we take reasonable care to protect your information, no system can guarantee complete security. If we become aware of a security incident that creates a real risk of significant harm to your information, we will notify you and the appropriate privacy regulator (the Office of the Privacy Commissioner of Canada and, where applicable, your provincial privacy commissioner) without undue delay after we determine the nature and scope of the incident. Our notification will include information about what happened, what data was affected, and what you can do to protect yourself.
          </p>
        </Section>

        {/* ── How long we keep it ── */}
        <Section title="How long we keep it">
          <p style={p}>
            We keep your information for as long as you have an active account, so that you can access and update your plan over time. The Nightside Planning Studio is designed for return — your account stays active indefinitely, and we do not deactivate accounts for inactivity.
          </p>
          <p style={p}>
            If you delete your account, all of your content is permanently removed from our active database immediately. Backups follow Supabase&apos;s standard retention schedule (typically 30 days), after which the data is permanently purged from those as well.
          </p>
          <p style={{ ...p, margin: 0 }}>
            For our internal event log (the record of how users move through the platform), we retain this data for as long as your account is active. When you delete your account, your associated event log entries are also deleted. We may keep anonymized, aggregated information about platform usage indefinitely for analysis purposes — this information cannot identify you.
          </p>
        </Section>

        {/* ── What happens if you die ── */}
        <Section title="What happens if you die">
          <p style={p}>
            End-of-life planning that doesn&apos;t account for what happens to the plan after death isn&apos;t complete planning. Because the platform is designed to help you create materials for the people who will need them, every user designates a Legacy Contact when signing up.
          </p>

          <h3 style={h3}>What the Legacy Contact does and doesn&apos;t do</h3>
          <p style={p}>
            Your Legacy Contact is the person you designate to receive your practical planning materials if you die. They do not have access to your plan while you are alive. They do not have any legal authority over your estate, your healthcare decisions, or any other matter. Their role is solely to receive your materials from this platform.
          </p>
          <p style={{ ...p, margin: 0 }}>
            Your Legacy Contact is not a substitute for an executor named in your will, a substitute decision-maker for healthcare, or any other legally designated role. If you want someone to have legal authority over those matters, you need to designate them through proper legal channels.
          </p>

          <h3 style={h3}>What gets released to your Legacy Contact by default</h3>
          <p style={p}>If you die, your Legacy Contact may receive an export of the following practical planning documents:</p>
          <ul style={ul}>
            {[
              'Wishes for My Body, Funeral & Ceremony',
              'Important Contacts',
              'Financial Information',
              'Personal Admin Information',
              'Devices & Accounts',
              'Keepsakes Inventory',
            ].map((item) => (
              <li key={item} style={{ ...li, marginBottom: 8 }}>{item}</li>
            ))}
          </ul>

          <h3 style={h3}>What you can choose to add to the release</h3>
          <p style={p}>
            You can choose to include additional content in what your Legacy Contact receives, such as your My Care Wishes document, your Legacy Map, your Values Ranking, or your Fears Ranking. By default, this content stays private even after your death. You decide what&apos;s released.
          </p>
          <p style={{ ...p, margin: 0 }}>
            You cannot remove items from the default release. The practical planning documents listed above were created to be used by others after your death. Including them in your Legacy Contact&apos;s release is part of how the platform serves its purpose.
          </p>

          <h3 style={h3}>Most users may never need this mechanism</h3>
          <p style={{ ...p, margin: 0 }}>
            Most people who complete their planning will export and share their plan with the people who&apos;ll need it during their lifetime. If you do this, your Legacy Contact may never need to activate their role. The Legacy Contact mechanism exists as a safety net for cases where this didn&apos;t happen, where your plan was significantly updated after you last shared it, or where the people who need the information weren&apos;t aware of the export.
          </p>

          <h3 style={h3}>How the Legacy Contact activates their role</h3>
          <p style={p}>
            If you die, your Legacy Contact can contact us at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>{' '}
            to begin the release process. They will need to provide:
          </p>
          <ul style={ul}>
            <li style={li}>Documentation of your death (a Statement of Death from a funeral director, a death certificate, or other comparable documentation — we work with Legacy Contacts to verify the death using whatever reasonable documentation is available)</li>
            <li style={{ ...li, marginBottom: 0 }}>Confirmation of their identity matching the Legacy Contact you designated</li>
          </ul>
          <p style={{ ...p, margin: '16px 0 16px' }}>
            We review each request and use judgment in handling individual cases. In urgent situations where documentation is still being processed, we may release essential information (such as your decision-makers&apos; contact information or your wishes for your body) while we wait for full documentation, at our discretion.
          </p>
          <p style={{ ...p, margin: 0 }}>
            For very recent designations (within 7 days of designation), we may apply a brief waiting period before processing a release request, to protect against fraudulent designations.
          </p>

          <h3 style={h3}>If your Legacy Contact predeceases you or is unavailable</h3>
          <p style={{ ...p, margin: 0 }}>
            You can designate a secondary Legacy Contact when signing up, or update your Legacy Contact designation anytime in your account settings. If your Legacy Contact dies or becomes unreachable, you can update your designation to someone else.
          </p>

          <h3 style={h3}>If no Legacy Contact is reachable when you die</h3>
          <p style={{ ...p, margin: 0 }}>
            If your designated Legacy Contact (primary and secondary) is unreachable or cannot be verified, your data is not released. We do not release planning materials to people who were not designated by you.
          </p>
        </Section>

        {/* ── Your rights ── */}
        <Section title="Your rights">
          <p style={p}>You have the following rights regarding your information:</p>
          <p style={p}>
            <strong style={{ fontWeight: 600 }}>Access and portability.</strong> You can view all of your information through the platform and export your full plan at any time. Exports are available as a PDF version of your plan.
          </p>
          <p style={p}>
            <strong style={{ fontWeight: 600 }}>Correction and updates.</strong> You can update your name, email address, and province through your My Account page. You can update or change your content (documents, activities, notes) at any time through the platform. You can update your Legacy Contact designation at any time. Changes to your email address and Legacy Contact require password confirmation.
          </p>
          <p style={p}>
            <strong style={{ fontWeight: 600 }}>Deletion.</strong> You can permanently delete your account and all associated information at any time through the My Account page. Deletion is immediate and cannot be undone.
          </p>
          <p style={p}>
            <strong style={{ fontWeight: 600 }}>Withdrawal of consent.</strong> You can stop using the platform and delete your account at any time.
          </p>
          <p style={{ ...p, margin: 0 }}>
            <strong style={{ fontWeight: 600 }}>Complaint.</strong> If you believe we have not handled your information appropriately, you can file a complaint with the Office of the Privacy Commissioner of Canada at{' '}
            <a href="https://priv.gc.ca" target="_blank" rel="noopener noreferrer" style={a}>priv.gc.ca</a>.
            {' '}If you live in Quebec, Alberta, or British Columbia, you can also contact your provincial privacy commissioner:
          </p>
          <ul style={{ ...ul, margin: '8px 0 16px' }}>
            <li style={li}>Quebec: <a href="https://cai.gouv.qc.ca" target="_blank" rel="noopener noreferrer" style={a}>cai.gouv.qc.ca</a></li>
            <li style={li}>Alberta: <a href="https://oipc.ab.ca" target="_blank" rel="noopener noreferrer" style={a}>oipc.ab.ca</a></li>
            <li style={{ ...li, marginBottom: 0 }}>British Columbia: <a href="https://oipc.bc.ca" target="_blank" rel="noopener noreferrer" style={a}>oipc.bc.ca</a></li>
          </ul>
          <p style={{ ...p, margin: 0 }}>
            We would prefer to address concerns directly first — please reach out at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>{' '}
            before filing a formal complaint, if you&apos;re willing.
          </p>
        </Section>

        {/* ── Privacy inquiries ── */}
        <StaticSection title="Privacy inquiries">
          <p style={{ ...p, margin: 0 }}>
            If you have questions about this policy or about how we handle your information, contact us at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>.
          </p>
        </StaticSection>

        {/* ── Privacy officer ── */}
        <StaticSection title="Privacy officer">
          <p style={{ ...p, margin: 0 }}>
            The Nightside Inc. has designated a privacy officer responsible for compliance with applicable Canadian privacy law and for responding to privacy inquiries. You can reach our privacy officer at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>.
          </p>
        </StaticSection>

        {/* ── Information about minors ── */}
        <StaticSection title="Information about minors">
          <p style={p}>
            The Nightside Planning Studio is intended for adults. By creating an account, you confirm that you are 18 years of age or older. We do not knowingly collect information from anyone under 18.
          </p>
          <p style={{ ...p, margin: 0 }}>
            If you become aware that a minor has provided information to us, please contact us at{' '}
            <a href="mailto:contact@thenightside.net" style={a}>contact@thenightside.net</a>. We will promptly delete any information we have collected from a minor and close any related accounts.
          </p>
        </StaticSection>

        {/* ── Changes to this policy ── */}
        <StaticSection title="Changes to this policy">
          <p style={{ ...p, margin: 0 }}>
            If we change this policy, we&apos;ll update the &ldquo;Last updated&rdquo; date at the top. For material changes — such as changes to who we share information with, how long we keep it, or what we do with it — we&apos;ll notify you by email before the changes take effect. The current version of this policy is always available at{' '}
            <a href="https://studio.thenightside.net/privacy" style={a}>https://studio.thenightside.net/privacy</a>.
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
