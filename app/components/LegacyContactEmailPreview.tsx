// On-page preview of the LC "you've been designated" email. The copy here MIRRORS
// lib/legacy-contact-emails.ts (buildDesignationEmail) — keep them in sync. The
// preview drifted once (stale headings + first-name-only) and showed users content
// that didn't match what their contact actually received; this is the single
// preview surface, role-aware, shared by the onboarding designation page and the
// account page. (Follow-up: extract the section copy into a shared source so the
// email builder and this preview can't diverge again.)

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

function toTitleCase(name: string): string {
  if (!name) return name
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// `lcRole` (not `role`) deliberately — a `role` prop trips jsx-a11y/aria-role, which
// reads it as the HTML ARIA role attribute and rejects "primary"/"secondary".
export default function LegacyContactEmailPreview({
  lcRole,
  userFirst,
  userLast = '',
  contactFirst,
  message = '',
}: {
  lcRole: 'primary' | 'secondary'
  userFirst: string
  userLast?: string
  contactFirst: string
  message?: string
}) {
  const first    = toTitleCase(userFirst) || 'you'
  const last     = toTitleCase(userLast)
  const fullName = last ? `${first} ${last}` : first
  const contact  = contactFirst.trim() ? toTitleCase(contactFirst) : '[Legacy Contact first name]'
  const trimmed  = message.trim()

  const about = lcRole === 'primary'
    ? `${first} has been doing end-of-life planning on the platform and has named you as their primary Legacy Contact. This means that if ${first} dies, you would be the person we release their practical planning materials to; this includes things like wishes for their body and funeral, important contacts, financial information, and other administrative details.`
    : `${first} has been doing end-of-life planning on the platform and has named you as their secondary Legacy Contact. This means that if ${first} dies and their primary Legacy Contact is unable to act, you would be the person we release their practical planning materials to; this includes things like wishes for their body and funeral, important contacts, financial information, and other administrative details.`

  const p: React.CSSProperties  = { fontFamily: hv, fontSize: 14, lineHeight: 1.65, color: 'rgba(19,4,38,0.75)', margin: '0 0 12px' }
  const h: React.CSSProperties  = { fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#130426', margin: '20px 0 4px' }
  const hr: React.CSSProperties = { border: 'none', borderTop: '1px solid rgba(19,4,38,0.15)', margin: '16px 0' }

  return (
    <div style={{
      background: 'rgba(19,4,38,0.04)',
      borderLeft: '3px solid rgba(19,4,38,0.15)',
      borderRadius: '0 8px 8px 0',
      padding: '20px 24px',
      marginTop: 12,
    }}>
      <p style={p}>Hi {contact},</p>
      <p style={p}>{fullName} has designated you as a Legacy Contact on The Nightside Planning Studio, an end-of-life planning platform.</p>

      <p style={h}>About this designation</p>
      <p style={p}>{about}</p>

      <p style={h}>What this means for you right now</p>
      <p style={p}>There&apos;s nothing for you to do at this moment. You don&apos;t have access to {first}&apos;s plan while they are alive, and this designation doesn&apos;t ask anything of you unless circumstances change.</p>
      <p style={p}>It also doesn&apos;t give you any legal authority over {first}&apos;s estate, healthcare, or other matters. If {first} wants you to have other authority, that&apos;s designated separately through legal documents like a will or representation agreement.</p>

      <p style={h}>If something happens to {first}</p>
      <p style={p}>If {first} passes away and you need to activate your role as Legacy Contact, you can reach out to us at contact@thenightside.net. We&apos;ll work with you to release {first}&apos;s planning materials and to confirm what has happened. We can be flexible about documentation depending on what&apos;s available; a death certificate, a Statement of Death from a funeral director, or other comparable documentation all work.</p>

      <p style={h}>If you have questions or concerns</p>
      <p style={p}>If you have questions about being designated, or if you&apos;d rather not take on this role, please reach out to {first} directly. They can update their designation at any time, and your relationship to them isn&apos;t tied to this designation in any way.</p>
      <p style={p}>{first} may reach out to you to talk about this soon. If they haven&apos;t yet, you&apos;re welcome to reach out to them.</p>

      {trimmed && (
        <>
          <div style={hr} />
          <p style={h}>A message from {first}</p>
          <p style={{ ...p, whiteSpace: 'pre-wrap', margin: 0 }}>{trimmed}</p>
          <div style={hr} />
        </>
      )}

      <p style={{ ...p, marginTop: trimmed ? 0 : 20 }}>If you have any questions about the platform itself, you can reach us at contact@thenightside.net.</p>
      <p style={{ ...p, margin: 0 }}>With care,<br />The Nightside</p>
    </div>
  )
}
