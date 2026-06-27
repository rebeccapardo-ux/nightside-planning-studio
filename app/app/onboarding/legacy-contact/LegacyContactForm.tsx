'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import OnboardingStepIndicator from '@/app/components/OnboardingStepIndicator'
import LegacyContactEmailPreview from '@/app/components/LegacyContactEmailPreview'

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

function PreviewToggleButton({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: 'none', border: 'none', padding: 0, fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#2C3777', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
        style={{ transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
        <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  )
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
        style={{ ...inputBase, border: error ? '1.5px solid #8B0000' : '1.5px solid rgba(19,4,38,0.15)' }}
      />
      {error && <span style={{ fontFamily: hv, fontSize: 13, color: '#8B0000' }}>{error}</span>}
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

// ─── Main form ──────────────────────────────────────────────────────────────

export default function LegacyContactForm() {
  const router = useRouter()

  const [userFirstName,    setUserFirstName]    = useState('you')
  const [userLastName,     setUserLastName]     = useState('')
  const [primary,          setPrimary]          = useState<ContactFields>(EMPTY)
  const [primaryErrors,    setPrimaryErrors]    = useState<Partial<Record<keyof ContactFields, string>>>({})
  const [showSecondary,    setShowSecondary]    = useState(false)
  const [secondary,        setSecondary]        = useState<ContactFields>(EMPTY)
  const [secondaryErrors,  setSecondaryErrors]  = useState<Partial<Record<keyof ContactFields, string>>>({})
  const [message,          setMessage]          = useState('')
  const [showPreview,      setShowPreview]      = useState(false)
  const [showSecondaryPreview, setShowSecondaryPreview] = useState(false)
  const [submitError,      setSubmitError]      = useState('')
  const [submitting,       setSubmitting]       = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {}
      const firstName = (meta.first_name as string) || data.user?.email?.split('@')[0] || 'you'
      setUserFirstName(firstName)
      setUserLastName((meta.last_name as string) || '')
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
      // The form is long and is submitted from the bottom; reset scroll before
      // navigating so the homepage opens at the top instead of briefly inheriting
      // this page's bottom offset and then jumping up.
      window.scrollTo(0, 0)
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
    fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.65)', margin: '0 0 14px', lineHeight: 1.5,
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

      {/* Step indicator — placed between header and content */}
      <div style={{ padding: '28px 24px 0' }}>
        <OnboardingStepIndicator currentStep={4} />
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px 88px' }}>

        <h1 style={{ fontFamily: apfel, fontSize: 36, fontWeight: 600, color: '#130426', margin: '0 0 20px', lineHeight: 1.1 }}>
          Designate your Legacy Contact
        </h1>

        {/* Intro */}
        <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.75, color: '#130426', margin: '0 0 14px' }}>
          Your Legacy Contact will only receive your practical planning materials in the event of your death — they won&apos;t have access while you&apos;re alive. The materials they receive include your wishes for your body, important contacts, financial information, and other administrative details. They won&apos;t include your reflective work or personal notes unless you choose to add them.
        </p>
        <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.75, color: '#130426', margin: '0 0 14px' }}>
          You can update your Legacy Contact and what they&apos;ll receive at any time from your account.
        </p>
        <p style={{ fontFamily: hv, fontSize: 17, lineHeight: 1.75, color: '#130426', margin: '0 0 32px' }}>
          This is required to use the platform. We know that people often create these materials in vulnerable circumstances, and we want to make sure that if something happens to you, your wishes can reach the people who need to act on them.
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
            After you designate them, we&apos;ll send them an email explaining the role. We recommend you also reach out personally to talk it through and answer any questions. You can update your designation anytime.
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(19,4,38,0.12)', margin: '0 0 36px' }} />

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Primary Legacy Contact ── */}
          <div style={{ marginBottom: 28 }}>
            <p style={sectionHead}>Primary Legacy Contact <span style={{ color: '#8B0000' }}>*</span></p>
            <ContactGroup values={primary} errors={primaryErrors} onChange={updatePrimary} idPrefix="primary" />
          </div>

          <hr style={divider} />

          {/* ── Secondary Legacy Contact ── */}
          <div style={{ marginBottom: 28 }}>
            <p style={sectionHead}>
              Secondary Legacy Contact{' '}
              <span style={{ fontWeight: 400, color: 'rgba(19,4,38,0.65)' }}>(optional)</span>
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
            {/* Primary preview. When a secondary is being added, the secondary's email
                differs (the "About this designation" paragraph), so it gets its own
                preview toggle — shown only once the user has opened the secondary form. */}
            <PreviewToggleButton
              open={showPreview}
              onClick={() => setShowPreview(v => !v)}
              label={showPreview ? 'Hide preview' : showSecondary ? 'View primary preview' : 'View preview'}
            />
            {showPreview && (
              <LegacyContactEmailPreview
                lcRole="primary"
                userFirst={userFirstName}
                userLast={userLastName}
                contactFirst={primary.firstName.trim()}
                message={message}
              />
            )}

            {showSecondary && (
              <div style={{ marginTop: 16 }}>
                <PreviewToggleButton
                  open={showSecondaryPreview}
                  onClick={() => setShowSecondaryPreview(v => !v)}
                  label={showSecondaryPreview ? 'Hide secondary preview' : 'View secondary preview'}
                />
                {showSecondaryPreview && (
                  <LegacyContactEmailPreview
                    lcRole="secondary"
                    userFirst={userFirstName}
                    userLast={userLastName}
                    contactFirst={secondary.firstName.trim()}
                    message={message}
                  />
                )}
              </div>
            )}
          </div>

          <hr style={divider} />

          {/* ── Personal message ── */}
          <div style={{ marginBottom: 36 }}>
            <label htmlFor="legacy-contact-message" style={sectionHead}>
              Personal message{' '}
              <span style={{ fontWeight: 400, color: 'rgba(19,4,38,0.65)' }}>(optional, up to 1,000 characters)</span>
            </label>
            <p style={sectionSub}>This will be included in the notification email sent to your Legacy Contact.</p>
            <textarea
              id="legacy-contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8,
                border: msgLimit ? '1.5px solid #8B0000' : '1.5px solid rgba(19,4,38,0.15)',
                fontFamily: hv, fontSize: 15, color: '#130426',
                background: '#ffffff', outline: 'none', resize: 'vertical', lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
              <span style={{
                fontFamily: hv, fontSize: 13,
                color: msgLimit ? '#8B0000' : msgWarn ? '#B06800' : 'rgba(19,4,38,0.4)',
              }}>
                {msgLen.toLocaleString()} / {MSG_SOFT.toLocaleString()} characters
                {msgLimit && ' — please shorten your message'}
              </span>
            </div>
          </div>

          {/* ── Error ── */}
          {submitError && (
            <div style={{ background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ fontFamily: hv, fontSize: 14, color: '#8B0000', margin: 0 }}>{submitError}</p>
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
