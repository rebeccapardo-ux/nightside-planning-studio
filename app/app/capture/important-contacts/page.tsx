'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'

const DOCUMENT_TYPE = 'important_contacts'
const DOCUMENT_TITLE = 'Important Contacts'

type ContactFields = {
  name: string
  phone: string
  email: string
  address: string
}

function emptyContact(): ContactFields {
  return { name: '', phone: '', email: '', address: '' }
}

type FormState = {
  // Doctors
  doctor1: ContactFields
  doctor2: ContactFields
  doctor3: ContactFields
  doctor4: ContactFields
  // Attorneys
  attorney1: ContactFields
  attorney2: ContactFields
  attorney3: ContactFields
  attorney4: ContactFields
  // Relatives
  relative1: ContactFields
  relative2: ContactFields
  relative3: ContactFields
  relative4: ContactFields
  // Friends
  friend1: ContactFields
  friend2: ContactFields
  friend3: ContactFields
  friend4: ContactFields
  // Others
  other1: ContactFields
  other2: ContactFields
  other3: ContactFields
  other4: ContactFields
}

const EMPTY_FORM: FormState = {
  doctor1: emptyContact(), doctor2: emptyContact(), doctor3: emptyContact(), doctor4: emptyContact(),
  attorney1: emptyContact(), attorney2: emptyContact(), attorney3: emptyContact(), attorney4: emptyContact(),
  relative1: emptyContact(), relative2: emptyContact(), relative3: emptyContact(), relative4: emptyContact(),
  friend1: emptyContact(), friend2: emptyContact(), friend3: emptyContact(), friend4: emptyContact(),
  other1: emptyContact(), other2: emptyContact(), other3: emptyContact(), other4: emptyContact(),
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type ContactGroup = 'doctor' | 'attorney' | 'relative' | 'friend' | 'other'

export default function ImportantContactsPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(Date.now())

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) return

        const { data: rows, error: loadError } = await supabase
          .from('entries')
          .select('id, content, created_at')
          .eq('user_id', user.id)
          .eq('document_type', DOCUMENT_TYPE)
          .order('created_at', { ascending: false })
          .limit(1)

        if (loadError) { console.error('LOAD ERROR:', loadError); return }

        const existing = rows?.[0]
        if (existing) {
          setEntryId(existing.id)
          setForm(mergeContent(existing.content))
          if (existing.created_at) setLastSavedAt(new Date(existing.created_at))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!lastSavedAt) return
    const interval = window.setInterval(() => setStatusNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [lastSavedAt])

  function mergeContent(content: unknown): FormState {
    if (!content || typeof content !== 'object') return EMPTY_FORM
    const c = content as Record<string, unknown>
    function mergeContact(raw: unknown): ContactFields {
      if (!raw || typeof raw !== 'object') return emptyContact()
      const r = raw as Record<string, unknown>
      return {
        name: typeof r.name === 'string' ? r.name : '',
        phone: typeof r.phone === 'string' ? r.phone : '',
        email: typeof r.email === 'string' ? r.email : '',
        address: typeof r.address === 'string' ? r.address : '',
      }
    }
    return {
      doctor1: mergeContact(c.doctor1), doctor2: mergeContact(c.doctor2),
      doctor3: mergeContact(c.doctor3), doctor4: mergeContact(c.doctor4),
      attorney1: mergeContact(c.attorney1), attorney2: mergeContact(c.attorney2),
      attorney3: mergeContact(c.attorney3), attorney4: mergeContact(c.attorney4),
      relative1: mergeContact(c.relative1), relative2: mergeContact(c.relative2),
      relative3: mergeContact(c.relative3), relative4: mergeContact(c.relative4),
      friend1: mergeContact(c.friend1), friend2: mergeContact(c.friend2),
      friend3: mergeContact(c.friend3), friend4: mergeContact(c.friend4),
      other1: mergeContact(c.other1), other2: mergeContact(c.other2),
      other3: mergeContact(c.other3), other4: mergeContact(c.other4),
    }
  }

  function updateContactField(group: ContactGroup, n: 1 | 2 | 3 | 4, field: keyof ContactFields, value: string) {
    const key = `${group}${n}` as keyof FormState
    setForm((prev) => ({
      ...prev,
      [key]: { ...(prev[key] as ContactFields), [field]: value },
    }))
  }

  async function handleSave() {
    const supabase = createSupabaseBrowserClient()
    try {
      setSaveState('saving')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setSaveState('error'); return }

      if (!entryId) {
        const { data: created, error } = await supabase
          .from('entries')
          .insert({ user_id: user.id, title: DOCUMENT_TITLE, section: 'capture', document_type: DOCUMENT_TYPE, content: form })
          .select('id')
          .single()
        if (error) { console.error('SAVE ERROR:', error); setSaveState('error'); return }
        if (created) { setEntryId(created.id); setLastSavedAt(new Date()); setStatusNow(Date.now()); setSaveState('saved') }
      } else {
        const { error } = await supabase.from('entries').update({ content: form }).eq('id', entryId)
        if (error) { console.error('SAVE ERROR:', error); setSaveState('error'); return }
        setLastSavedAt(new Date()); setStatusNow(Date.now()); setSaveState('saved')
      }
      window.setTimeout(() => setSaveState((c) => (c === 'saved' ? 'idle' : c)), 2000)
    } catch (err) {
      console.error('UNEXPECTED SAVE ERROR:', err)
      setSaveState('error')
    }
  }

  const saveButtonLabel = useMemo(() => {
    if (saveState === 'saving') return 'Saving...'
    if (saveState === 'saved') return 'Saved'
    if (saveState === 'error') return 'Try saving again'
    return 'Save progress'
  }, [saveState])

  const saveStatusText = useMemo(() => {
    if (!lastSavedAt) return null
    const diffMs = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffSeconds < 10) return 'Saved just now'
    if (diffSeconds < 60) return `Saved ${diffSeconds}s ago`
    if (diffMinutes < 60) return `Last updated ${diffMinutes}m ago`
    if (diffHours < 24) return `Last updated ${diffHours}h ago`
    return `Last updated ${diffDays}d ago`
  }, [lastSavedAt, statusNow])

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-[#f8f4eb]/60">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#f8f4eb] mb-3">Important Contacts</h1>
        <p className="text-[#f8f4eb]/70 leading-relaxed">
          You can revisit, edit, or export it in My Materials.
        </p>
      </div>

      <div className="space-y-6">
        <ContactSection
          title="IMPORTANT CONTACTS: DOCTOR/S"
          group="doctor"
          form={form}
          onUpdate={updateContactField}
        />
        <ContactSection
          title="IMPORTANT CONTACTS: ATTORNEY/S"
          group="attorney"
          form={form}
          onUpdate={updateContactField}
        />
        <ContactSection
          title="IMPORTANT CONTACTS: RELATIVES"
          group="relative"
          form={form}
          onUpdate={updateContactField}
        />
        <ContactSection
          title="IMPORTANT CONTACTS: FRIENDS"
          group="friend"
          form={form}
          onUpdate={updateContactField}
        />
        <ContactSection
          title="IMPORTANT CONTACTS: OTHERS"
          group="other"
          form={form}
          onUpdate={updateContactField}
        />

        <SaveBar saveState={saveState} saveButtonLabel={saveButtonLabel} saveStatusText={saveStatusText} onSave={handleSave} />
      </div>
    </div>
  )
}

function ContactSection({
  title,
  group,
  form,
  onUpdate,
}: {
  title: string
  group: ContactGroup
  form: FormState
  onUpdate: (group: ContactGroup, n: 1 | 2 | 3 | 4, field: keyof ContactFields, value: string) => void
}) {
  return (
    <div className="space-y-6">
      <SectionHeading>{title}</SectionHeading>
      {([1, 2, 3, 4] as const).map((n) => {
        const key = `${group}${n}` as keyof FormState
        const contact = form[key] as ContactFields
        return (
          <div key={n} className="space-y-3 pb-4 border-b border-[#f8f4eb]/10 last:border-0">
            <Field label="Name:" value={contact.name} onChange={(v) => onUpdate(group, n, 'name', v)} rows={1} />
            <Field label="Phone:" value={contact.phone} onChange={(v) => onUpdate(group, n, 'phone', v)} rows={1} />
            <Field label="Email:" value={contact.email} onChange={(v) => onUpdate(group, n, 'email', v)} rows={1} />
            <Field label="Address:" value={contact.address} onChange={(v) => onUpdate(group, n, 'address', v)} rows={2} />
          </div>
        )
      })}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-[#f8f4eb] pt-4 pb-1 border-b border-[#f8f4eb]/10">{children}</h2>
}

function Field({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-[#f8f4eb]/80 text-sm mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-[#f8f4eb] text-[#130426] placeholder:text-[#130426]/40 px-4 py-3 rounded-lg focus:outline-none"
      />
    </div>
  )
}

function SaveBar({ saveState, saveButtonLabel, saveStatusText, onSave }: {
  saveState: SaveState; saveButtonLabel: string; saveStatusText: string | null; onSave: () => void
}) {
  return (
    <div className="pt-2 space-y-2">
      <button
        onClick={onSave}
        disabled={saveState === 'saving'}
        className="px-6 py-3 bg-[#f29836] text-[#130426] rounded font-semibold hover:bg-[#f29836]/90 transition disabled:opacity-50"
      >
        {saveButtonLabel}
      </button>
      {(saveStatusText || saveState === 'error') && (
        <div className="space-y-1">
          {saveStatusText && <p className="text-sm text-[#f8f4eb]/85">{saveStatusText}</p>}
          {saveState === 'error' ? (
            <p className="text-sm text-[#f29836]">Your changes did not save. Please try again.</p>
          ) : (
            <p className="text-sm text-[#f8f4eb]/60">
              You can return to this anytime in{' '}
              <Link href="/app/materials" className="underline">My Materials</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
