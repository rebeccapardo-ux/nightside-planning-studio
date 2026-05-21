'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const hv    = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const apfel = "'ApfelGrotezk', sans-serif"

const MSG_SOFT = 1000
const MSG_HARD = 1500

interface ContactFields {
  firstName:    string
  lastName:     string
  email:        string
  relationship: string
}

const EMPTY: ContactFields = { firstName: '', lastName: '', email: '', relationship: '' }

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

function toTitleCase(name: string): string {
  if (!name) return name
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Contact field (module-scope so React never remounts on re-render) ────────

const inputBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  borderRadius: 8, fontFamily: hv, fontSize: 15, color: '#130426',
  background: '#ffffff', outline: 'none',
}

function ContactField({
  field, label, type = 'text', value, error, onChange, idPrefix,
}: {
  field:    keyof ContactFields
  label:    string
  type?:    string
  value:    string
  error?:   string
  onChange: (field: keyof ContactFields, value: string) => void
  idPrefix: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>{label}</span>
      <input
        id={`${idPrefix}-${field}`}
        type={type}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        autoComplete={type === 'email' ? 'off' : undefined}
        style={{ ...inputBase, border: error ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)' }}
      />
      {error && <span style={{ fontFamily: hv, fontSize: 13, color: '#C04828' }}>{error}</span>}
    </label>
  )
}

// ─── Reusable contact field group ─────────────────────────────────────────

function ContactGroup({
  values,
  errors,
  onChange,
  idPrefix,
}: {
  values:   ContactFields
  errors:   Partial<Record<keyof ContactFields, string>>
  onChange: (field: keyof ContactFields, value: string) => void
  idPrefix: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ContactField field="firstName" label="First name *" value={values.firstName} error={errors.firstName} onChange={onChange} idPrefix={idPrefix} />
        <ContactField field="lastName"  label="Last name *"  value={values.lastName}  error={errors.lastName}  onChange={onChange} idPrefix={idPrefix} />
      </div>
      <ContactField field="email"        label="Email *"               type="email" value={values.email}        error={errors.email}        onChange={onChange} idPrefix={idPrefix} />
      <ContactField field="relationship" label="Relationship to you *"              value={values.relationship} error={errors.relationship} onChange={onChange} idPrefix={idPrefix} />
    </div>
  )
}

// ─── Email preview ─────────────────────────────────────────────────────────

function EmailPreview({
  userName,
  contactName,
  message,
}: {
  userName:    string
  contactName: string
  message:     string
}) {
  const name    = toTitleCase(userName) || 'you'
  const contact = contactName.trim() ? toTitleCase(contactName) : '[Legacy Contact first name]'
  const trimmed = message.trim()

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
      <p style={p}>{name} has designated you as a Legacy Contact on The Nightside Planning Studio, an end-of-life planning platform.</p>

      <p style={h}>What this means</p>
      <p style={p}>{name} has created a plan on the platform that includes information their family or community may need after their death — things like wishes for their body and funeral, important contacts, financial information, and other administrative details. By designating you as their Legacy Contact, {name} has named you as someone we can release those planning materials to if they die.</p>

      <p style={h}>What you don&apos;t need to do</p>
      <p style={p}>You don&apos;t have any access to {name}&apos;s plan while they&apos;re alive. You have no role to play unless they die. Most users export and share their plan with the people who&apos;ll need it during their lifetime, so this designation may never need to be activated.</p>
      <p style={p}>Your designation as Legacy Contact does not give you any legal authority over {name}&apos;s estate, healthcare decisions, or other matters. It only allows us to release their planning materials from this platform if they die. If {name} wants you to have other authority, that needs to be designated separately through legal documents like a will or representation agreement.</p>

      <p style={h}>What to do if {name} dies</p>
      <p style={p}>If {name} dies and you need to activate your role as Legacy Contact, contact us at contact@thenightside.net. We&apos;ll work with you to verify the death and release {name}&apos;s planning materials. Verification may include a death certificate, a Statement of Death from a funeral director, or other comparable documentation.</p>

      <p style={h}>If you&apos;d rather not be {name}&apos;s Legacy Contact</p>
      <p style={p}>If you don&apos;t want to be designated as {name}&apos;s Legacy Contact, please let them know directly. They can update their designation at any time.</p>
      <p style={{ ...p, margin: 0 }}>{name} may reach out to you soon to talk about this designation. If they haven&apos;t yet, feel free to reach out to them too.</p>

      {trimmed && (
        <>
          <div style={hr} />
          <p style={h}>A message from {name}</p>
          <p style={{ ...p, whiteSpace: 'pre-wrap', margin: 0 }}>{trimmed}</p>
          <div style={hr} />
        </>
      )}

      <p style={{ ...p, marginTop: trimmed ? 0 : 20 }}>If you have any questions about the platform or this role, you can reach us at contact@thenightside.net.</p>
      <p style={{ ...p, margin: 0 }}>— The Nightside</p>
    </div>
  )
}

// ─── Main form ──────────────────────────────────────────────────────────────

export default function LegacyContactForm() {
  const router = useRouter()

  const [userFirstName,    setUserFirstName]    = useState('you')
  const [primary,          setPrimary]          = useState<ContactFields>(EMPTY)
  const [primaryErrors,    setPrimaryErrors]    = useState<Partial<Record<keyof ContactFields, string>>>({})
  const [showSecondary,    setShowSecondary]    = useState(false)
  const [secondary,        setSecondary]        = useState<ContactFields>(EMPTY)
  const [secondaryErrors,  setSecondaryErrors]  = useState<Partial<Record<keyof ContactFields, string>>>({})
  const [message,          setMessage]          = useState('')
  const [showPreview,      setShowPreview]      = useState(false)
  const [submitError,      setSubmitError]      = useState('')
  const [submitting,       setSubmitting]       = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {}
      const firstName = (meta.first_name as string) || data.user?.email?.split('@')[0] || 'you'
      setUserFirstName(firstName)
    })
  }, [])

  const msgLen   = message.length
  const msgWarn  = msgLen >= MSG_SOFT && msgLen < MSG_HARD
  const msgLimit = msgLen >= MSG_HARD

  function updatePrimary(field: keyof ContactFields, value: string) {
    setPrimary(p => ({ ...p, [field]: value }))
    if (primaryErrors[field]) setPrimaryErrors(e => ({ ...e, [field]: '' }))
  }

  function updateSecondary(field: keyof ContactFields, value: string) {
    setSecondary(p => ({ ...p, [field]: value }))
    if (secondaryErrors[field]) setSecondaryErrors(e => ({ ...e, [field]: '' }))
  }

  function validate(): boolean {
    let ok = true
    const pe: Partial<Record<keyof ContactFields, string>> = {}
    const se: Partial<Record<keyof ContactFields, string>> = {}

    if (!primary.firstName.trim())    { pe.firstName    = 'Required'; ok = false }
    if (!primary.lastName.trim())     { pe.lastName     = 'Required'; ok = false }
    if (!primary.email.trim())        { pe.email        = 'Required'; ok = false }
    else if (!isValidEmail(primary.email)) { pe.email   = 'Enter a valid email address'; ok = false }
    if (!primary.relationship.trim()) { pe.relationship = 'Required'; ok = false }

    if (showSecondary) {
      if (!secondary.firstName.trim())    { se.firstName    = 'Required'; ok = false }
      if (!secondary.lastName.trim())     { se.lastName     = 'Required'; ok = false }
      if (!secondary.email.trim())        { se.email        = 'Required'; ok = false }
      else if (!isValidEmail(secondary.email)) { se.email   = 'Enter a valid email address'; ok = false }
      if (!secondary.relationship.trim()) { se.relationship = 'Required'; ok = false }

      if (
        !se.email && secondary.email &&
        secondary.email.toLowerCase() === primary.email.toLowerCase()
      ) {
        se.email = 'Must differ from primary Legacy Contact email'
        ok = false
      }
    }

    if (msgLimit) ok = false

    setPrimaryErrors(pe)
    setSecondaryErrors(se)
    return ok
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/legacy-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary: {
            firstName:    primary.firstName.trim(),
            lastName:     primary.lastName.trim(),
            email:        primary.email.trim().toLowerCase(),
            relationship: primary.relationship.trim(),
          },
          secondary: showSecondary ? {
            firstName:    secondary.firstName.trim(),
            lastName:     secondary.lastName.trim(),
            email:        secondary.email.trim().toLowerCase(),
            relationship: secondary.relationship.trim(),
          } : null,
          personalMessage: message.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      router.push('/app')
    } catch {
      setSubmitError('Something went wrong. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const sectionHead: React.CSSProperties = {
    fontFamily: hv, fontSize: 16, fontWeight: 600, color: '#130426', margin: '0 0 4px',
  }
  const sectionSub: React.CSSProperties = {
    fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.55)', margin: '0 0 14px', lineHeight: 1.5,
  }
  const divider: React.CSSProperties = {
    border: 'none', borderTop: '1px solid rgba(19,4,38,0.12)', margin: '0 0 28px',
  }
  const ghostBtn: React.CSSProperties = {
    background: 'none', border: '1.5px solid rgba(19,4,38,0.2)', borderRadius: 22,
    padding: '9px 18px', fontFamily: hv, fontSize: 14, fontWeight: 600,
    color: '#130426', cursor: 'pointer',
  }

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh' }}>

      {/* Minimal header */}
      <header style={{ borderBottom: '1px solid rgba(19,4,38,0.08)', padding: '16px 24px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/The-Nightside-Wordmark-Black.svg" alt="The Nightside" style={{ height: 28, width: 'auto' }} />
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px 88px' }}>

        <h1 style={{ fontFamily: apfel, fontSize: 36, fontWeight: 600, color: '#130426', margin: '0 0 20px', lineHeight: 1.1 }}>
          Designate your Legacy Contact
        </h1>

        {/* Intro */}
        <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.75, color: '#130426', margin: '0 0 14px' }}>
          Before you start planning, you&apos;ll designate someone we can release your practical planning materials to if you die. This includes your wishes for your body, important contacts, financial information, and other administrative details. It does not include your reflective work or personal notes; those stay private unless you choose to add them.
        </p>
        <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.75, color: '#130426', margin: '0 0 14px' }}>
          You can update your Legacy Contact and what they&apos;ll receive at any time from your account.
        </p>
        <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.75, color: '#130426', margin: '0 0 32px' }}>
          This is required to use the platform. End-of-life planning that doesn&apos;t account for what happens to the plan after death isn&apos;t complete planning.
        </p>

        {/* Important callout — only section with visual emphasis */}
        <div style={{ borderLeft: '3px solid #DB5835', paddingLeft: 20, marginBottom: 32 }}>
          <p style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#130426', margin: '0 0 10px' }}>
            Important: This is not the same as a legal designation
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.65, color: 'rgba(19,4,38,0.75)', margin: '0 0 10px' }}>
            Your Legacy Contact will only receive the materials you&apos;ve created on this platform if you die. They have no other authority. They cannot make decisions about your body, your healthcare, your finances, your estate, or any other matter unless you have separately designated them through legal documents like a will or representation agreement.
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.65, color: 'rgba(19,4,38,0.75)', margin: 0 }}>
            Many people designate the same person as both their Legacy Contact and their executor. If that&apos;s what you want, you also need to name that person in your will.
          </p>
        </div>

        {/* Who to designate — plain prose */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 600, color: '#130426', margin: '0 0 8px' }}>Who to designate</p>
          <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.65, color: 'rgba(19,4,38,0.75)', margin: '0 0 8px' }}>
            Most people designate a family member, a close friend, or a professional like a lawyer. Choose someone who will be reachable and trustworthy.
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.65, color: 'rgba(19,4,38,0.75)', margin: 0 }}>
            Plan to reach out to them after you designate them, so they understand the role and have a chance to ask questions. You can update your designation anytime.
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(19,4,38,0.12)', margin: '0 0 36px' }} />

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Primary Legacy Contact ── */}
          <div style={{ marginBottom: 28 }}>
            <p style={sectionHead}>Primary Legacy Contact <span style={{ color: '#C04828' }}>*</span></p>
            <ContactGroup values={primary} errors={primaryErrors} onChange={updatePrimary} idPrefix="primary" />
          </div>

          <hr style={divider} />

          {/* ── Secondary Legacy Contact ── */}
          <div style={{ marginBottom: 28 }}>
            <p style={sectionHead}>
              Secondary Legacy Contact{' '}
              <span style={{ fontWeight: 400, color: 'rgba(19,4,38,0.5)' }}>(optional)</span>
            </p>
            {!showSecondary ? (
              <>
                <p style={sectionSub}>In case your primary Legacy Contact is unavailable when needed.</p>
                <button type="button" onClick={() => setShowSecondary(true)} style={ghostBtn}>
                  + Add secondary Legacy Contact
                </button>
              </>
            ) : (
              <>
                <p style={sectionSub}>In case your primary Legacy Contact is unavailable when needed.</p>
                <ContactGroup values={secondary} errors={secondaryErrors} onChange={updateSecondary} idPrefix="secondary" />
                <button
                  type="button"
                  onClick={() => { setShowSecondary(false); setSecondary(EMPTY); setSecondaryErrors({}) }}
                  style={{ background: 'none', border: 'none', padding: '10px 0 0', fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.45)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Remove secondary Legacy Contact
                </button>
              </>
            )}
          </div>

          <hr style={divider} />

          {/* ── What your Legacy Contact will receive ── */}
          <div style={{ marginBottom: 28 }}>
            <p style={sectionHead}>What your Legacy Contact will receive</p>
            <p style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.6, color: 'rgba(19,4,38,0.6)', fontStyle: 'italic', margin: '6px 0 10px' }}>
              Your Legacy Contact will receive an email explaining their designation, what it means, and what to do if you die. You can optionally add a personal message below, which will be included in the email.
            </p>
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontFamily: hv, fontSize: 14, fontWeight: 600,
                color: '#2C3777', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                style={{ transition: 'transform 200ms ease', transform: showPreview ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {showPreview ? 'Hide preview' : 'View preview'}
            </button>

            {showPreview && (
              <EmailPreview
                userName={userFirstName}
                contactName={primary.firstName.trim()}
                message={message}
              />
            )}
          </div>

          <hr style={divider} />

          {/* ── Personal message ── */}
          <div style={{ marginBottom: 36 }}>
            <p style={sectionHead}>
              Personal message{' '}
              <span style={{ fontWeight: 400, color: 'rgba(19,4,38,0.5)' }}>(optional, up to 1,000 characters)</span>
            </p>
            <p style={sectionSub}>This will be included in the notification email sent to your Legacy Contact.</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8,
                border: msgLimit ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)',
                fontFamily: hv, fontSize: 15, color: '#130426',
                background: '#ffffff', outline: 'none', resize: 'vertical', lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
              <span style={{
                fontFamily: hv, fontSize: 13,
                color: msgLimit ? '#C04828' : msgWarn ? '#B06800' : 'rgba(19,4,38,0.4)',
              }}>
                {msgLen.toLocaleString()} / {MSG_SOFT.toLocaleString()} characters
                {msgLimit && ' — please shorten your message'}
              </span>
            </div>
          </div>

          {/* ── Error ── */}
          {submitError && (
            <div style={{ background: 'rgba(192,72,40,0.08)', border: '1px solid rgba(192,72,40,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ fontFamily: hv, fontSize: 14, color: '#C04828', margin: 0 }}>{submitError}</p>
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={submitting || msgLimit}
            style={{
              width: '100%', padding: '14px 0',
              background: submitting || msgLimit ? 'rgba(19,4,38,0.25)' : '#130426',
              color: '#F8F4EB', border: 'none', borderRadius: 10,
              fontFamily: hv, fontSize: 16, fontWeight: 600,
              cursor: submitting || msgLimit ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            {submitting ? 'Saving…' : 'Save and start planning'}
          </button>

        </form>
      </div>
    </div>
  )
}
