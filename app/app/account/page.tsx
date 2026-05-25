'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

// ── Types ────────────────────────────────────────────────────────────────────

interface LegacyContact {
  id: string
  contact_type: 'primary' | 'secondary'
  first_name: string
  last_name: string
  email: string
  relationship: string
  designated_at: string
}

interface ContactFields {
  firstName:    string
  lastName:     string
  email:        string
  relationship: string
}

interface ReleasePrefs {
  include_care_wishes:    boolean
  include_legacy_map:     boolean
  include_values_ranking: boolean
  include_fears_ranking:  boolean
}

type FlowType = 'update' | 'add-secondary' | 'remove-secondary'
type UpdateMode = 'edit' | 'replace-confirm' | 'replace'

interface ActiveFlow {
  type:        FlowType
  contactType: 'primary' | 'secondary'
  existing?:   LegacyContact
}

// ── Constants ────────────────────────────────────────────────────────────────

const hv       = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const EMPTY: ContactFields = { firstName: '', lastName: '', email: '', relationship: '' }
const MSG_SOFT = 1000
const MSG_HARD = 1500

const DEFAULT_RELEASE_ITEMS = [
  'Wishes for My Body, Funeral & Ceremony',
  'Important Contacts',
  'Financial Information',
  'Personal Admin Information',
  'Devices & Accounts',
  'Keepsakes Inventory',
]

const OPTIONAL_RELEASE_ITEMS: Array<{ key: keyof ReleasePrefs; label: string; description: string }> = [
  { key: 'include_care_wishes',    label: 'My Care Wishes',   description: 'Your healthcare preferences and priorities for end-of-life.' },
  { key: 'include_legacy_map',     label: 'Legacy Map',       description: "The life moments you've mapped as part of your life review." },
  { key: 'include_values_ranking', label: 'Values Ranking',   description: 'Your ranked priorities and values.' },
  { key: 'include_fears_ranking',  label: 'Fears Ranking',    description: 'Your ranked fears and concerns about end-of-life.' },
]

const STORAGE_PREFIXES = ['nightside.', 'nightside-legacy-map', 'reflect-', 'checkbox_', 'ready_', 'orient_']
const SS_PREFIXES      = ['nightside_', 'nightside.']

const CANADIAN_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon',
]

// ── Utilities ────────────────────────────────────────────────────────────────

function toTitleCase(name: string): string {
  if (!name) return name
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

function clearLocalStorage(uid: string) {
  const lsKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && STORAGE_PREFIXES.some(p => k.startsWith(p)) && !k.includes(uid)) lsKeys.push(k)
  }
  lsKeys.forEach(k => localStorage.removeItem(k))
  const ssKeys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)
    if (k && SS_PREFIXES.some(p => k.startsWith(p)) && !k.includes(uid)) ssKeys.push(k)
  }
  ssKeys.forEach(k => sessionStorage.removeItem(k))
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <span style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.5)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#130426', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

function Field({
  label, type, value, onChange, autoComplete, error,
}: {
  label: string; type: string; value: string
  onChange: (v: string) => void
  autoComplete?: string; error?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>{label}</span>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={{
          padding: '10px 14px',
          border: error ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)',
          borderRadius: 8, fontFamily: hv, fontSize: 15, color: '#130426',
          background: '#ffffff', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
      {error && <span style={{ fontFamily: hv, fontSize: 13, color: '#C04828' }}>{error}</span>}
    </label>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AccountPage() {
  const [user,           setUser]           = useState<User | null>(null)
  const [legacyContacts, setLegacyContacts] = useState<LegacyContact[]>([])
  const [releasePrefs,   setReleasePrefs]   = useState<ReleasePrefs>({
    include_care_wishes: false, include_legacy_map: false,
    include_values_ranking: false, include_fears_ranking: false,
  })

  // Legacy Contact flow state
  const [activeFlow,          setActiveFlow]          = useState<ActiveFlow | null>(null)
  const [updateMode,          setUpdateMode]          = useState<UpdateMode>('edit')
  const [flowFields,          setFlowFields]          = useState<ContactFields>(EMPTY)
  const [originalFlowFields,  setOriginalFlowFields]  = useState<ContactFields>(EMPTY)
  const [flowErrors,          setFlowErrors]          = useState<Partial<Record<keyof ContactFields, string>>>({})
  const [flowMessage,         setFlowMessage]         = useState('')
  const [flowPassword,        setFlowPassword]        = useState('')
  const [flowStatus,          setFlowStatus]          = useState<'idle' | 'loading' | 'error'>('idle')
  const [flowError,           setFlowError]           = useState('')

  // Edit profile modal
  const [profileModal,   setProfileModal]   = useState(false)
  const [profileFields,  setProfileFields]  = useState({ firstName: '', lastName: '', province: '' })
  const [profileErrors,  setProfileErrors]  = useState<{ firstName?: string; lastName?: string; province?: string }>({})
  const [profileStatus,  setProfileStatus]  = useState<'idle' | 'loading' | 'error'>('idle')
  const [profileError,   setProfileError]   = useState('')

  // Change email modal
  const [emailModal,   setEmailModal]   = useState(false)
  const [newEmail,     setNewEmail]     = useState('')
  const [emailPw,      setEmailPw]      = useState('')
  const [emailErrors,  setEmailErrors]  = useState<{ newEmail?: string; emailPw?: string }>({})
  const [emailStatus,  setEmailStatus]  = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [emailError,   setEmailError]   = useState('')

  // Change password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwStatus,        setPwStatus]        = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [pwError,         setPwError]         = useState('')

  // Delete account
  const [deleteStep,     setDeleteStep]     = useState<null | 'confirm' | 'password'>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteStatus,   setDeleteStatus]   = useState<'idle' | 'loading' | 'error'>('idle')
  const [deleteError,    setDeleteError]    = useState('')

  const refreshContacts = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase
      .from('legacy_contacts')
      .select('id,contact_type,first_name,last_name,email,relationship,designated_at')
      .order('contact_type', { ascending: true })
    if (data) setLegacyContacts(data as LegacyContact[])
  }, [])

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase
          .from('user_release_preferences')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle()
          .then(({ data: prefs }) => {
            if (prefs) setReleasePrefs({
              include_care_wishes:    prefs.include_care_wishes,
              include_legacy_map:     prefs.include_legacy_map,
              include_values_ranking: prefs.include_values_ranking,
              include_fears_ranking:  prefs.include_fears_ranking,
            })
          })
      }
    })
    refreshContacts()
  }, [refreshContacts])

  // ── Legacy Contact flow ────────────────────────────────────────────────────

  function openFlow(flow: ActiveFlow) {
    setActiveFlow(flow)
    if (flow.type === 'update' && flow.existing) {
      const pre: ContactFields = {
        firstName:    flow.existing.first_name,
        lastName:     flow.existing.last_name,
        email:        flow.existing.email,
        relationship: flow.existing.relationship,
      }
      setFlowFields(pre)
      setOriginalFlowFields(pre)
    } else {
      setFlowFields(EMPTY)
      setOriginalFlowFields(EMPTY)
    }
    setUpdateMode('edit')
    setFlowErrors({})
    setFlowMessage('')
    setFlowPassword('')
    setFlowStatus('idle')
    setFlowError('')
  }

  function closeFlow() {
    setActiveFlow(null)
    setFlowFields(EMPTY)
    setOriginalFlowFields(EMPTY)
    setUpdateMode('edit')
    setFlowErrors({})
    setFlowMessage('')
    setFlowPassword('')
    setFlowStatus('idle')
    setFlowError('')
  }

  function updateFlowField(field: keyof ContactFields, value: string) {
    setFlowFields(p => ({ ...p, [field]: value }))
    if (flowErrors[field]) setFlowErrors(e => ({ ...e, [field]: '' }))
  }

  function validateFlowFields(): boolean {
    if (!activeFlow || activeFlow.type === 'remove-secondary') return true
    if (activeFlow.type === 'update' && updateMode === 'replace-confirm') return true
    const fe: Partial<Record<keyof ContactFields, string>> = {}
    let ok = true

    if (!flowFields.firstName.trim())    { fe.firstName    = 'Required'; ok = false }
    if (!flowFields.lastName.trim())     { fe.lastName     = 'Required'; ok = false }
    if (!flowFields.email.trim())        { fe.email        = 'Required'; ok = false }
    else if (!isValidEmail(flowFields.email)) { fe.email   = 'Enter a valid email address'; ok = false }
    if (!flowFields.relationship.trim()) { fe.relationship = 'Required'; ok = false }

    const emailLc = flowFields.email.trim().toLowerCase()
    if (!fe.email && emailLc) {
      if (emailLc === user?.email?.toLowerCase()) {
        fe.email = 'Cannot use your own email address'; ok = false
      } else {
        const otherType = activeFlow.contactType === 'primary' ? 'secondary' : 'primary'
        const other = legacyContacts.find(c => c.contact_type === otherType)
        if (other && emailLc === other.email.toLowerCase()) {
          fe.email = `Must differ from your ${otherType} Legacy Contact's email`; ok = false
        }
      }
    }

    setFlowErrors(fe)
    return ok
  }

  async function handleFlowSubmit() {
    if (!activeFlow) return
    if (!validateFlowFields()) return
    if (!flowPassword) { setFlowError('Password is required'); return }
    if (flowMessage.length > MSG_HARD) return

    setFlowStatus('loading')
    setFlowError('')

    const apiAction =
      activeFlow.type === 'update'
        ? (updateMode === 'replace' ? 'replace' : 'edit')
        : activeFlow.type

    const body: Record<string, unknown> = {
      action:      apiAction,
      contactType: activeFlow.contactType,
      password:    flowPassword,
    }

    if (activeFlow.type !== 'remove-secondary') {
      body.contact = {
        firstName:    flowFields.firstName.trim(),
        lastName:     flowFields.lastName.trim(),
        email:        flowFields.email.trim().toLowerCase(),
        relationship: flowFields.relationship.trim(),
      }
    }
    if (apiAction === 'replace' || activeFlow.type === 'add-secondary') {
      body.personalMessage = flowMessage.trim() || null
    }

    try {
      const res  = await fetch('/api/legacy-contact/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setFlowError(data.error ?? 'Something went wrong. Please try again.')
        setFlowStatus('error')
        return
      }
      await refreshContacts()
      closeFlow()
    } catch {
      setFlowError('Something went wrong. Please check your connection and try again.')
      setFlowStatus('error')
    }
  }

  // ── Edit profile ──────────────────────────────────────────────────────────

  function openProfileModal() {
    const meta = user?.user_metadata ?? {}
    setProfileFields({
      firstName: (meta.first_name as string) || '',
      lastName:  (meta.last_name  as string) || '',
      province:  (meta.province   as string) || '',
    })
    setProfileErrors({})
    setProfileStatus('idle')
    setProfileError('')
    setProfileModal(true)
  }

  function closeProfileModal() {
    setProfileModal(false)
    setProfileErrors({})
    setProfileStatus('idle')
    setProfileError('')
  }

  async function handleSaveProfile() {
    const errs: { firstName?: string; lastName?: string; province?: string } = {}
    if (!profileFields.firstName.trim()) errs.firstName = 'Required'
    if (!profileFields.lastName.trim())  errs.lastName  = 'Required'
    if (!profileFields.province.trim())  errs.province  = 'Required'
    if (Object.keys(errs).length) { setProfileErrors(errs); return }

    setProfileStatus('loading')
    setProfileError('')
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.updateUser({
      data: {
        first_name: profileFields.firstName.trim(),
        last_name:  profileFields.lastName.trim(),
        province:   profileFields.province.trim(),
      },
    })
    if (error) { setProfileError(error.message); setProfileStatus('error'); return }
    setUser(data.user)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'account_settings_updated', metadata: { type: 'profile' } }),
    }).catch(() => {})
    closeProfileModal()
  }

  // ── Change email ───────────────────────────────────────────────────────────

  function openEmailModal() {
    setNewEmail('')
    setEmailPw('')
    setEmailErrors({})
    setEmailStatus('idle')
    setEmailError('')
    setEmailModal(true)
  }

  function closeEmailModal() {
    setEmailModal(false)
    setNewEmail('')
    setEmailPw('')
    setEmailErrors({})
    setEmailStatus('idle')
    setEmailError('')
  }

  async function handleChangeEmail() {
    const errs: { newEmail?: string; emailPw?: string } = {}
    if (!newEmail.trim())                     errs.newEmail = 'Required'
    else if (!isValidEmail(newEmail.trim()))  errs.newEmail = 'Enter a valid email address'
    else if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase())
                                              errs.newEmail = 'This is already your current email address'
    if (!emailPw) errs.emailPw = 'Required'
    if (Object.keys(errs).length) { setEmailErrors(errs); return }

    setEmailStatus('loading')
    setEmailError('')
    const supabase = createSupabaseBrowserClient()

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user!.email!, password: emailPw,
    })
    if (authErr) { setEmailErrors({ emailPw: 'Incorrect password' }); setEmailStatus('error'); return }

    const { error: updateErr } = await supabase.auth.updateUser({ email: newEmail.trim() })
    if (updateErr) { setEmailError(updateErr.message); setEmailStatus('error'); return }

    setEmailStatus('sent')
  }

  // ── Release prefs ──────────────────────────────────────────────────────────

  async function handleReleaseToggle(field: keyof ReleasePrefs, value: boolean) {
    setReleasePrefs(p => ({ ...p, [field]: value }))
    if (!user) return
    const supabase = createSupabaseBrowserClient()
    await supabase
      .from('user_release_preferences')
      .upsert({ user_id: user.id, [field]: value }, { onConflict: 'user_id' })
  }

  // ── Change password ────────────────────────────────────────────────────────

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match.'); return }
    if (newPassword.length < 8)          { setPwError('New password must be at least 8 characters.'); return }
    setPwStatus('loading')
    const supabase = createSupabaseBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!, password: currentPassword,
    })
    if (signInError) { setPwError('Current password is incorrect.'); setPwStatus('error'); return }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) { setPwError(updateError.message); setPwStatus('error'); return }
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'account_settings_updated', metadata: { type: 'password' } }),
    }).catch(() => {})
    setPwStatus('success')
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setPwStatus('idle'), 4000)
  }

  // ── Delete account ─────────────────────────────────────────────────────────

  async function handleDeleteAccount() {
    setDeleteStatus('loading')
    setDeleteError('')
    const res = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: deletePassword }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setDeleteError(body.error ?? 'Something went wrong. Please try again.')
      setDeleteStatus('error')
      return
    }
    clearLocalStorage(user?.id ?? '')
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/account-deleted'
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const meta = user?.user_metadata ?? {}

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const formattedLastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      })
    : '—'

  const primaryContact   = legacyContacts.find(c => c.contact_type === 'primary')
  const secondaryContact = legacyContacts.find(c => c.contact_type === 'secondary')
  const msgLen = flowMessage.length
  const msgWarn  = msgLen >= MSG_SOFT && msgLen < MSG_HARD
  const msgLimit = msgLen >= MSG_HARD

  // ── Shared styles ──────────────────────────────────────────────────────────

  const sectionH2: React.CSSProperties = {
    fontFamily: hv, fontSize: 22, fontWeight: 600, color: '#DB5835',
    margin: '0 0 16px',
  }
  const subSectionH3: React.CSSProperties = {
    fontFamily: hv, fontSize: 16, fontWeight: 600, color: '#DB5835',
    margin: '0 0 12px',
  }
  const card: React.CSSProperties = {
    background: '#ffffff', border: '1px solid rgba(19,4,38,0.08)', borderRadius: 12,
  }
  const ghostSmall: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(19,4,38,0.2)', borderRadius: 20,
    padding: '6px 14px', fontFamily: hv, fontSize: 13, fontWeight: 600,
    color: '#130426', cursor: 'pointer',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#F8F4EB', minHeight: '100vh', padding: '64px 24px 80px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        <h1 style={{ fontFamily: hv, fontSize: 32, fontWeight: 600, color: '#130426', margin: '0 0 40px' }}>
          My Account
        </h1>

        {/* ── Account info ── */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h2 style={{ ...sectionH2, margin: 0 }}>Account Info</h2>
            <button onClick={openProfileModal} style={ghostSmall}>Edit account info</button>
          </div>
          <div style={{ ...card, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row label="First name"   value={toTitleCase((meta.first_name as string) || '—')} />
            <Row label="Last name"    value={toTitleCase((meta.last_name  as string) || '—')} />
            <Row label="Province"     value={(meta.province as string) || '—'} />
            <Row label="Member since" value={formattedDate} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.5)', flexShrink: 0 }}>Last sign-in</span>
                <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#130426', textAlign: 'right' }}>{formattedLastSignIn}</span>
              </div>
              <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.4)', margin: 0, lineHeight: 1.5 }}>
                If this looks unfamiliar, your account may have been accessed without your knowledge. Contact us at{' '}
                <a href="mailto:contact@thenightside.net" style={{ color: 'rgba(19,4,38,0.5)' }}>contact@thenightside.net</a> if you're concerned.
              </p>
            </div>
          </div>
        </section>

        {/* ── Account access ── */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={sectionH2}>Account Access</h2>
          <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.5)', lineHeight: 1.5, margin: '0 0 16px' }}>
            These credentials require additional verification when changed.
          </p>
          <div style={{ ...card, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Email row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingBottom: 16 }}>
              <span style={{ fontFamily: hv, fontSize: 16, fontWeight: 600, color: '#130426', flexShrink: 0 }}>Email</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#130426', wordBreak: 'break-all' }}>{user?.email ?? '—'}</span>
                <button onClick={openEmailModal} style={{ background: 'none', border: 'none', padding: 0, fontFamily: hv, fontSize: 13, color: '#DB5835', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Change</button>
              </div>
            </div>
            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(19,4,38,0.08)', paddingTop: 20 }}>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: hv, fontSize: 16, fontWeight: 600, color: '#130426' }}>Password</span>
                  <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#130426', letterSpacing: '0.1em' }}>••••••••</span>
                </div>
                <Field label="Current password"     type="password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
                <Field label="New password"         type="password" value={newPassword}     onChange={setNewPassword}     autoComplete="new-password" />
                <Field label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                {pwError && <p style={{ fontFamily: hv, fontSize: 14, color: '#C04828', margin: 0 }}>{pwError}</p>}
                {pwStatus === 'success' && <p style={{ fontFamily: hv, fontSize: 14, color: '#2D7A4F', margin: 0 }}>Password updated successfully.</p>}
                <button
                  type="submit"
                  disabled={pwStatus === 'loading'}
                  style={{
                    alignSelf: 'flex-start', background: '#130426', color: '#F8F4EB',
                    border: 'none', borderRadius: 22, padding: '10px 22px',
                    fontFamily: hv, fontSize: 14, fontWeight: 600,
                    cursor: pwStatus === 'loading' ? 'wait' : 'pointer',
                    opacity: pwStatus === 'loading' ? 0.6 : 1,
                  }}
                >
                  {pwStatus === 'loading' ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ── Legacy Contacts ── */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={sectionH2}>Legacy Contacts</h2>
          <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.55)', lineHeight: 1.6, margin: '0 0 16px' }}>
            If you pass away, your Legacy Contact(s) may be eligible to receive your practical planning materials. They do not have access to your plan while you are alive.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Primary */}
            {primaryContact ? (
              <div style={{ ...card, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Legacy Contact</span>
                <Row label="Name"         value={`${toTitleCase(primaryContact.first_name)} ${toTitleCase(primaryContact.last_name)}`} />
                <Row label="Email"        value={primaryContact.email} />
                <Row label="Relationship" value={primaryContact.relationship} />
                <Row label="Designated"   value={new Date(primaryContact.designated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button style={ghostSmall} onClick={() => openFlow({ type: 'update', contactType: 'primary', existing: primaryContact })}>Update</button>
                </div>
              </div>
            ) : (
              <div style={{ ...card, padding: '16px 20px' }}>
                <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Legacy Contact</span>
                <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.45)', margin: '6px 0 0' }}>Not designated</p>
              </div>
            )}

            {/* Secondary */}
            {secondaryContact ? (
              <div style={{ ...card, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secondary Legacy Contact</span>
                <Row label="Name"         value={`${toTitleCase(secondaryContact.first_name)} ${toTitleCase(secondaryContact.last_name)}`} />
                <Row label="Email"        value={secondaryContact.email} />
                <Row label="Relationship" value={secondaryContact.relationship} />
                <Row label="Designated"   value={new Date(secondaryContact.designated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button style={ghostSmall} onClick={() => openFlow({ type: 'update', contactType: 'secondary', existing: secondaryContact })}>Update</button>
                  <button style={{ ...ghostSmall, color: '#C04828', borderColor: 'rgba(192,72,40,0.3)' }}
                          onClick={() => openFlow({ type: 'remove-secondary', contactType: 'secondary', existing: secondaryContact })}>Remove</button>
                </div>
              </div>
            ) : (
              <div style={{ ...card, padding: '16px 20px' }}>
                <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secondary Legacy Contact</span>
                <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.45)', margin: '6px 0 8px' }}>Not designated</p>
                <button
                  style={ghostSmall}
                  onClick={() => openFlow({ type: 'add-secondary', contactType: 'secondary' })}
                >
                  + Add secondary Legacy Contact
                </button>
              </div>
            )}

          </div>
        </section>

        {/* ── What your Legacy Contact will receive ── */}
        <section style={{ marginBottom: 48 }}>
          <h3 style={subSectionH3}>What Your Legacy Contact Will Receive</h3>
          <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.7)', lineHeight: 1.6, margin: '0 0 12px' }}>
            By default, if you pass away, your Legacy Contact will receive your practical planning materials:
          </p>
          <ul style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.7)', lineHeight: 1.7, margin: '0 0 20px', paddingLeft: 20, listStyleType: 'disc' }}>
            {DEFAULT_RELEASE_ITEMS.map(item => <li key={item}>{item}</li>)}
          </ul>
          <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.7)', lineHeight: 1.6, margin: '0 0 16px' }}>
            You can choose to include additional content below. By default, this content stays private even after your death.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            {OPTIONAL_RELEASE_ITEMS.map(({ key, label, description }) => (
              <label
                key={key}
                style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={releasePrefs[key]}
                  onChange={e => handleReleaseToggle(key, e.target.checked)}
                  style={{ marginTop: 3, flexShrink: 0, accentColor: '#130426', width: 16, height: 16 }}
                />
                <div>
                  <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#130426', display: 'block', marginBottom: 2 }}>{label}</span>
                  <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.55)', fontStyle: 'italic' }}>{description}</span>
                </div>
              </label>
            ))}
          </div>
          <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.45)', margin: 0 }}>
            Your selections save automatically.
          </p>
        </section>

        {/* ── Delete account ── */}
        <section>
          <h2 style={sectionH2}>Delete Account</h2>
          <div style={{ ...card, padding: '24px' }}>
            <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <button
              onClick={() => setDeleteStep('confirm')}
              className="delete-btn"
              style={{ background: 'none', border: '1.5px solid rgba(192,72,40,0.5)', borderRadius: 22, padding: '10px 22px', fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#C04828', cursor: 'pointer' }}
            >
              Delete my account
            </button>
          </div>
        </section>

      </div>

      {/* ── Legacy Contact flow modal ── */}
      {activeFlow && (
        <div
          onClick={closeFlow}
          style={{ position: 'fixed', inset: 0, background: 'rgba(19,4,38,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#F8F4EB', borderRadius: 16, padding: '32px 36px', maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Update (unified edit + replace flow) */}
            {activeFlow.type === 'update' && (
              <>
                <h3 style={{ fontFamily: hv, fontSize: 19, fontWeight: 600, color: '#130426', margin: '0 0 20px' }}>
                  Update Legacy Contact
                </h3>

                {/* Replace-confirm step — replaces form content */}
                {updateMode === 'replace-confirm' && activeFlow.existing && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: 'rgba(19,4,38,0.75)', margin: '0 0 20px' }}>
                      <strong>{toTitleCase(activeFlow.existing.first_name)} {toTitleCase(activeFlow.existing.last_name)}</strong> will receive a notification that they are no longer your Legacy Contact. You can then designate someone else.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => { setFlowFields(originalFlowFields); setFlowErrors({}); setUpdateMode('edit') }}
                        style={{ flex: 1, background: 'rgba(19,4,38,0.07)', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#130426', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { setFlowFields(EMPTY); setFlowMessage(''); setFlowErrors({}); setUpdateMode('replace') }}
                        style={{ flex: 1, background: '#130426', color: '#F8F4EB', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit mode */}
                {updateMode === 'edit' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="First name *" type="text" value={flowFields.firstName} onChange={v => updateFlowField('firstName', v)} error={flowErrors.firstName} />
                      <Field label="Last name *"  type="text" value={flowFields.lastName}  onChange={v => updateFlowField('lastName',  v)} error={flowErrors.lastName} />
                    </div>
                    <Field label="Email *"               type="email" value={flowFields.email}        onChange={v => updateFlowField('email',        v)} error={flowErrors.email}        autoComplete="off" />
                    <Field label="Relationship to you *" type="text"  value={flowFields.relationship} onChange={v => updateFlowField('relationship', v)} error={flowErrors.relationship} />
                  </div>
                )}

                {/* Replace mode */}
                {updateMode === 'replace' && (
                  <>
                    {activeFlow.existing && (
                      <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.5)', margin: '0 0 18px', lineHeight: 1.5 }}>
                        You are designating a new person to replace <strong style={{ color: '#130426' }}>{toTitleCase(activeFlow.existing.first_name)} {toTitleCase(activeFlow.existing.last_name)}</strong>.
                      </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="First name *" type="text" value={flowFields.firstName} onChange={v => updateFlowField('firstName', v)} error={flowErrors.firstName} />
                        <Field label="Last name *"  type="text" value={flowFields.lastName}  onChange={v => updateFlowField('lastName',  v)} error={flowErrors.lastName} />
                      </div>
                      <Field label="Email *"               type="email" value={flowFields.email}        onChange={v => updateFlowField('email',        v)} error={flowErrors.email}        autoComplete="off" />
                      <Field label="Relationship to you *" type="text"  value={flowFields.relationship} onChange={v => updateFlowField('relationship', v)} error={flowErrors.relationship} />
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>
                        Personal message <span style={{ fontWeight: 400, color: 'rgba(19,4,38,0.45)' }}>(optional)</span>
                      </span>
                      <span style={{ fontFamily: hv, fontSize: 12, color: 'rgba(19,4,38,0.45)', marginBottom: 4 }}>
                        This will be included in the notification email sent to your new Legacy Contact.
                      </span>
                      <textarea
                        value={flowMessage} onChange={e => setFlowMessage(e.target.value)} rows={4}
                        style={{ padding: '10px 14px', border: msgLimit ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)', borderRadius: 8, fontFamily: hv, fontSize: 14, color: '#130426', background: '#ffffff', outline: 'none', resize: 'vertical', lineHeight: 1.6, width: '100%', boxSizing: 'border-box' }}
                      />
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                      <span style={{ fontFamily: hv, fontSize: 12, color: msgLimit ? '#C04828' : msgWarn ? '#B06800' : 'rgba(19,4,38,0.4)' }}>
                        {msgLen.toLocaleString()} / {MSG_SOFT.toLocaleString()}
                        {msgLimit && ' — please shorten'}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Add secondary */}
            {activeFlow.type === 'add-secondary' && (
              <>
                <h3 style={{ fontFamily: hv, fontSize: 19, fontWeight: 600, color: '#130426', margin: '0 0 20px' }}>
                  Add secondary Legacy Contact
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="First name *" type="text" value={flowFields.firstName} onChange={v => updateFlowField('firstName', v)} error={flowErrors.firstName} />
                    <Field label="Last name *"  type="text" value={flowFields.lastName}  onChange={v => updateFlowField('lastName',  v)} error={flowErrors.lastName} />
                  </div>
                  <Field label="Email *"              type="email" value={flowFields.email}        onChange={v => updateFlowField('email',        v)} error={flowErrors.email}        autoComplete="off" />
                  <Field label="Relationship to you *" type="text" value={flowFields.relationship} onChange={v => updateFlowField('relationship', v)} error={flowErrors.relationship} />
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>
                    Personal message <span style={{ fontWeight: 400, color: 'rgba(19,4,38,0.45)' }}>(optional)</span>
                  </span>
                  <textarea
                    value={flowMessage} onChange={e => setFlowMessage(e.target.value)} rows={4}
                    style={{ padding: '10px 14px', border: msgLimit ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)', borderRadius: 8, fontFamily: hv, fontSize: 14, color: '#130426', background: '#ffffff', outline: 'none', resize: 'vertical', lineHeight: 1.6, width: '100%', boxSizing: 'border-box' }}
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                  <span style={{ fontFamily: hv, fontSize: 12, color: msgLimit ? '#C04828' : msgWarn ? '#B06800' : 'rgba(19,4,38,0.4)' }}>
                    {msgLen.toLocaleString()} / {MSG_SOFT.toLocaleString()}
                    {msgLimit && ' — please shorten'}
                  </span>
                </div>
              </>
            )}

            {/* Remove secondary */}
            {activeFlow.type === 'remove-secondary' && activeFlow.existing && (
              <>
                <h3 style={{ fontFamily: hv, fontSize: 19, fontWeight: 600, color: '#130426', margin: '0 0 12px' }}>
                  Remove secondary Legacy Contact?
                </h3>
                <p style={{ fontFamily: hv, fontSize: 15, lineHeight: 1.6, color: 'rgba(19,4,38,0.7)', margin: '0 0 24px' }}>
                  Remove {toTitleCase(activeFlow.existing.first_name)} {toTitleCase(activeFlow.existing.last_name)} as your secondary Legacy Contact? They will be notified that they are no longer designated.
                </p>
              </>
            )}

            {/* Password + action buttons (hidden during replace-confirm step) */}
            {!(activeFlow.type === 'update' && updateMode === 'replace-confirm') && (
              <>
                <div style={{ borderTop: '1px solid rgba(19,4,38,0.1)', paddingTop: 20, marginBottom: 20 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>Your password to confirm this change</span>
                    <input
                      type="password"
                      value={flowPassword}
                      onChange={e => setFlowPassword(e.target.value)}
                      autoComplete="current-password"
                      onKeyDown={e => { if (e.key === 'Enter') handleFlowSubmit() }}
                      style={{
                        padding: '10px 14px', border: '1.5px solid rgba(19,4,38,0.15)', borderRadius: 8,
                        fontFamily: hv, fontSize: 15, color: '#130426', background: '#ffffff', outline: 'none',
                        width: '100%', boxSizing: 'border-box',
                      }}
                    />
                  </label>
                </div>

                {flowError && (
                  <div style={{ background: 'rgba(192,72,40,0.08)', border: '1px solid rgba(192,72,40,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                    <p style={{ fontFamily: hv, fontSize: 14, color: '#C04828', margin: 0 }}>{flowError}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={closeFlow}
                    style={{ flex: 1, background: 'rgba(19,4,38,0.07)', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#130426', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFlowSubmit}
                    disabled={flowStatus === 'loading' || !flowPassword || msgLimit}
                    style={{
                      flex: 1,
                      background: activeFlow.type === 'remove-secondary'
                        ? (flowStatus === 'loading' || !flowPassword ? 'rgba(192,72,40,0.35)' : '#C04828')
                        : (flowStatus === 'loading' || !flowPassword ? 'rgba(19,4,38,0.25)' : '#130426'),
                      color: '#F8F4EB', border: 'none', borderRadius: 22, padding: '11px 0',
                      fontFamily: hv, fontSize: 14, fontWeight: 600,
                      cursor: flowStatus === 'loading' || !flowPassword || msgLimit ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {flowStatus === 'loading' ? 'Saving…' : (
                      activeFlow.type === 'update' && updateMode === 'replace' ? 'Save' :
                      activeFlow.type === 'update'                             ? 'Save' :
                      activeFlow.type === 'add-secondary'                      ? 'Add Legacy Contact' :
                                                                                  'Remove Legacy Contact'
                    )}
                  </button>
                </div>

                {/* "Designate someone else" link — edit mode only */}
                {activeFlow.type === 'update' && updateMode === 'edit' && (
                  <div style={{ borderTop: '1px solid rgba(19,4,38,0.08)', marginTop: 20, paddingTop: 16, textAlign: 'center' }}>
                    <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.45)' }}>
                      Want to designate someone else as your Legacy Contact instead?{' '}
                    </span>
                    <button
                      onClick={() => setUpdateMode('replace-confirm')}
                      style={{ background: 'none', border: 'none', padding: 0, fontFamily: hv, fontSize: 13, color: '#130426', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Designate someone else
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit profile modal ── */}
      {profileModal && (
        <div
          onClick={closeProfileModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(19,4,38,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#F8F4EB', borderRadius: 16, padding: '32px 36px', maxWidth: 480, width: '100%' }}
          >
            <h3 style={{ fontFamily: hv, fontSize: 19, fontWeight: 600, color: '#130426', margin: '0 0 24px' }}>Edit account info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>First name *</span>
                  <input
                    type="text" value={profileFields.firstName}
                    onChange={e => setProfileFields(p => ({ ...p, firstName: e.target.value }))}
                    style={{ padding: '10px 14px', border: profileErrors.firstName ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)', borderRadius: 8, fontFamily: hv, fontSize: 15, color: '#130426', background: '#ffffff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                  />
                  {profileErrors.firstName && <span style={{ fontFamily: hv, fontSize: 13, color: '#C04828' }}>{profileErrors.firstName}</span>}
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>Last name *</span>
                  <input
                    type="text" value={profileFields.lastName}
                    onChange={e => setProfileFields(p => ({ ...p, lastName: e.target.value }))}
                    style={{ padding: '10px 14px', border: profileErrors.lastName ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)', borderRadius: 8, fontFamily: hv, fontSize: 15, color: '#130426', background: '#ffffff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                  />
                  {profileErrors.lastName && <span style={{ fontFamily: hv, fontSize: 13, color: '#C04828' }}>{profileErrors.lastName}</span>}
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>Province *</span>
                <select
                  value={profileFields.province}
                  onChange={e => setProfileFields(p => ({ ...p, province: e.target.value }))}
                  style={{ padding: '10px 14px', border: profileErrors.province ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)', borderRadius: 8, fontFamily: hv, fontSize: 15, color: profileFields.province ? '#130426' : 'rgba(19,4,38,0.35)', background: '#ffffff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">Select province or territory</option>
                  {CANADIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {profileErrors.province && <span style={{ fontFamily: hv, fontSize: 13, color: '#C04828' }}>{profileErrors.province}</span>}
              </label>
            </div>
            {profileError && (
              <div style={{ background: 'rgba(192,72,40,0.08)', border: '1px solid rgba(192,72,40,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ fontFamily: hv, fontSize: 14, color: '#C04828', margin: 0 }}>{profileError}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeProfileModal} style={{ flex: 1, background: 'rgba(19,4,38,0.07)', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#130426', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleSaveProfile}
                disabled={profileStatus === 'loading'}
                style={{ flex: 1, background: profileStatus === 'loading' ? 'rgba(19,4,38,0.25)' : '#130426', color: '#F8F4EB', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, cursor: profileStatus === 'loading' ? 'wait' : 'pointer' }}
              >
                {profileStatus === 'loading' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change email modal ── */}
      {emailModal && (
        <div
          onClick={emailStatus !== 'sent' ? closeEmailModal : undefined}
          style={{ position: 'fixed', inset: 0, background: 'rgba(19,4,38,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#F8F4EB', borderRadius: 16, padding: '32px 36px', maxWidth: 480, width: '100%' }}
          >
            {emailStatus === 'sent' ? (
              <>
                <h3 style={{ fontFamily: hv, fontSize: 19, fontWeight: 600, color: '#130426', margin: '0 0 14px' }}>Check your new email</h3>
                <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', lineHeight: 1.6, margin: '0 0 24px' }}>
                  We've sent a confirmation link to <strong>{newEmail.trim()}</strong>. Click the link in that email to complete the change. We've also notified your current email about this request.
                </p>
                <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.5)', lineHeight: 1.5, margin: '0 0 24px' }}>
                  Your current email stays active until you confirm the new one.
                </p>
                <button onClick={closeEmailModal} style={{ width: '100%', background: '#130426', color: '#F8F4EB', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Got it</button>
              </>
            ) : (
              <>
                <h3 style={{ fontFamily: hv, fontSize: 19, fontWeight: 600, color: '#130426', margin: '0 0 8px' }}>Change email</h3>
                <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.55)', lineHeight: 1.5, margin: '0 0 24px' }}>
                  You'll receive a confirmation link at your new address. Your current email stays active until you confirm.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>New email address *</span>
                    <input
                      type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      autoComplete="off"
                      style={{ padding: '10px 14px', border: emailErrors.newEmail ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)', borderRadius: 8, fontFamily: hv, fontSize: 15, color: '#130426', background: '#ffffff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    />
                    {emailErrors.newEmail && <span style={{ fontFamily: hv, fontSize: 13, color: '#C04828' }}>{emailErrors.newEmail}</span>}
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontFamily: hv, fontSize: 13, fontWeight: 600, color: 'rgba(19,4,38,0.6)' }}>Current password *</span>
                    <input
                      type="password" value={emailPw} onChange={e => setEmailPw(e.target.value)}
                      autoComplete="current-password"
                      onKeyDown={e => { if (e.key === 'Enter') handleChangeEmail() }}
                      style={{ padding: '10px 14px', border: emailErrors.emailPw ? '1.5px solid #C04828' : '1.5px solid rgba(19,4,38,0.15)', borderRadius: 8, fontFamily: hv, fontSize: 15, color: '#130426', background: '#ffffff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    />
                    {emailErrors.emailPw && <span style={{ fontFamily: hv, fontSize: 13, color: '#C04828' }}>{emailErrors.emailPw}</span>}
                  </label>
                </div>
                {emailError && (
                  <div style={{ background: 'rgba(192,72,40,0.08)', border: '1px solid rgba(192,72,40,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                    <p style={{ fontFamily: hv, fontSize: 14, color: '#C04828', margin: 0 }}>{emailError}</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeEmailModal} style={{ flex: 1, background: 'rgba(19,4,38,0.07)', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#130426', cursor: 'pointer' }}>Cancel</button>
                  <button
                    onClick={handleChangeEmail}
                    disabled={emailStatus === 'loading'}
                    style={{ flex: 1, background: emailStatus === 'loading' ? 'rgba(19,4,38,0.25)' : '#130426', color: '#F8F4EB', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, cursor: emailStatus === 'loading' ? 'wait' : 'pointer' }}
                  >
                    {emailStatus === 'loading' ? 'Sending…' : 'Send confirmation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete account modal ── */}
      {deleteStep !== null && (
        <div
          onClick={() => { setDeleteStep(null); setDeletePassword(''); setDeleteError(''); setDeleteStatus('idle') }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(19,4,38,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#F8F4EB', borderRadius: 16, padding: '36px 40px', maxWidth: 480, width: '100%' }}>
            {deleteStep === 'confirm' && (
              <>
                <h3 style={{ fontFamily: hv, fontSize: 20, fontWeight: 600, color: '#130426', margin: '0 0 12px' }}>Delete your account?</h3>
                <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', margin: '0 0 20px', lineHeight: 1.6 }}>
                  This will permanently delete all your notes, documents, activities, and account data. It cannot be undone.
                </p>
                <div style={{ background: '#EDE9F8', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
                  <p style={{ fontFamily: hv, fontSize: 14, color: '#130426', margin: '0 0 12px', lineHeight: 1.55 }}>
                    We recommend downloading a copy of your complete plan before deleting your account.
                  </p>
                  <a href="/app/plan/export" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#130426', color: '#F8F4EB', borderRadius: 22, padding: '9px 18px', fontFamily: hv, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                      <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#f8f4eb" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M1.5 10.5h10" stroke="#f8f4eb" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Download your data first
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setDeleteStep(null)} style={{ flex: 1, background: 'rgba(19,4,38,0.07)', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#130426', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => setDeleteStep('password')} style={{ flex: 1, background: '#C04828', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}>Continue to delete</button>
                </div>
              </>
            )}
            {deleteStep === 'password' && (
              <>
                <h3 style={{ fontFamily: hv, fontSize: 20, fontWeight: 600, color: '#130426', margin: '0 0 12px' }}>Confirm your password</h3>
                <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.7)', margin: '0 0 20px', lineHeight: 1.6 }}>
                  Enter your password to permanently delete your account.
                </p>
                <input
                  type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Your password" autoFocus
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1.5px solid rgba(19,4,38,0.2)', borderRadius: 8, fontFamily: hv, fontSize: 15, color: '#130426', background: '#ffffff', outline: 'none', marginBottom: deleteError ? 8 : 20 }}
                />
                {deleteError && <p style={{ fontFamily: hv, fontSize: 14, color: '#C04828', margin: '0 0 16px' }}>{deleteError}</p>}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setDeleteStep('confirm'); setDeletePassword(''); setDeleteError(''); setDeleteStatus('idle') }}
                    style={{ flex: 1, background: 'rgba(19,4,38,0.07)', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#130426', cursor: 'pointer' }}>Back</button>
                  <button onClick={handleDeleteAccount}
                    disabled={deleteStatus === 'loading' || !deletePassword}
                    style={{ flex: 1, background: '#C04828', border: 'none', borderRadius: 22, padding: '11px 0', fontFamily: hv, fontSize: 14, fontWeight: 600, color: '#ffffff', cursor: deleteStatus === 'loading' || !deletePassword ? 'not-allowed' : 'pointer', opacity: deleteStatus === 'loading' || !deletePassword ? 0.6 : 1 }}>
                    {deleteStatus === 'loading' ? 'Deleting…' : 'Delete my account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`.delete-btn:hover { border-color: #C04828 !important; background: rgba(192,72,40,0.04) !important; }`}</style>
    </div>
  )
}
