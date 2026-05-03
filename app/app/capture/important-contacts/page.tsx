'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

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
  doctor1: ContactFields
  doctor2: ContactFields
  doctor3: ContactFields
  doctor4: ContactFields
  attorney1: ContactFields
  attorney2: ContactFields
  attorney3: ContactFields
  attorney4: ContactFields
  relative1: ContactFields
  relative2: ContactFields
  relative3: ContactFields
  relative4: ContactFields
  friend1: ContactFields
  friend2: ContactFields
  friend3: ContactFields
  friend4: ContactFields
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

type ContactGroup = 'doctor' | 'attorney' | 'relative' | 'friend' | 'other'

export default function ImportantContactsPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const formRef = useRef<FormState>(EMPTY_FORM)
  const entryIdRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
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
          entryIdRef.current = existing.id
          const merged = mergeContent(existing.content)
          formRef.current = merged
          setForm(merged)
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
    const newForm = {
      ...formRef.current,
      [key]: { ...(formRef.current[key] as ContactFields), [field]: value },
    }
    formRef.current = newForm
    setForm(newForm)
    scheduleAutosave()
  }

  function scheduleAutosave() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performAutosave(), 1500)
  }

  function handleBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      performAutosave()
    }
  }

  async function performAutosave() {
    const currentForm = formRef.current
    setSaveStatus('saving')
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setSaveStatus('error'); return }

      if (!entryIdRef.current) {
        const { data: created, error } = await supabase
          .from('entries')
          .insert({ user_id: user.id, title: DOCUMENT_TITLE, section: 'capture', document_type: DOCUMENT_TYPE, content: currentForm })
          .select('id')
          .single()
        if (error) { setSaveStatus('error'); return }
        if (created) entryIdRef.current = created.id
      } else {
        const { error } = await supabase.from('entries').update({ content: currentForm }).eq('id', entryIdRef.current)
        if (error) { setSaveStatus('error'); return }
      }
      setLastSavedAt(new Date())
      setStatusNow(Date.now())
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  const saveStatusText = useMemo(() => {
    if (!lastSavedAt) return null
    const diffMs = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffSeconds < 60) return 'Last saved just now'
    if (diffMinutes < 60) return `Last saved ${diffMinutes} min ago`
    if (diffHours < 24) return diffHours === 1 ? 'Last saved 1 hour ago' : `Last saved ${diffHours} hours ago`
    if (diffDays < 7) return diffDays === 1 ? 'Last saved 1 day ago' : `Last saved ${diffDays} days ago`
    return diffWeeks === 1 ? 'Last saved 1 week ago' : `Last saved ${diffWeeks} weeks ago`
  }, [lastSavedAt, statusNow])

  if (loading) return (
    <div className="min-h-screen bg-[#F8F4EB]">
      <div className="max-w-3xl mx-auto px-4 py-16 text-[#130426]/60">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8F4EB]">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div style={{ marginBottom: 24 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Plan', href: '/app/materials' },
              { label: 'Important Contacts' },
            ]}
          />
        </div>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#130426] mb-3">Important Contacts</h1>
            <p className="text-[#130426]/70 leading-relaxed">
              You can revisit, edit, or export it in My Materials.
            </p>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(19,4,38,0.55)', minWidth: 120, textAlign: 'right', paddingTop: 4, flexShrink: 0 }}>
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && saveStatusText}
            {saveStatus === 'error' && "Couldn't save — check your connection"}
          </div>
        </div>

        <div className="space-y-6">
          <ContactSection title="IMPORTANT CONTACTS: DOCTOR/S" group="doctor" form={form} onUpdate={updateContactField} onBlur={handleBlur} />
          <ContactSection title="IMPORTANT CONTACTS: ATTORNEY/S" group="attorney" form={form} onUpdate={updateContactField} onBlur={handleBlur} />
          <ContactSection title="IMPORTANT CONTACTS: RELATIVES" group="relative" form={form} onUpdate={updateContactField} onBlur={handleBlur} />
          <ContactSection title="IMPORTANT CONTACTS: FRIENDS" group="friend" form={form} onUpdate={updateContactField} onBlur={handleBlur} />
          <ContactSection title="IMPORTANT CONTACTS: OTHERS" group="other" form={form} onUpdate={updateContactField} onBlur={handleBlur} />
        </div>
      </div>
    </div>
  )
}

function ContactSection({
  title, group, form, onUpdate, onBlur,
}: {
  title: string
  group: ContactGroup
  form: FormState
  onUpdate: (group: ContactGroup, n: 1 | 2 | 3 | 4, field: keyof ContactFields, value: string) => void
  onBlur: () => void
}) {
  return (
    <div className="space-y-6">
      <SectionHeading>{title}</SectionHeading>
      {([1, 2, 3, 4] as const).map((n) => {
        const key = `${group}${n}` as keyof FormState
        const contact = form[key] as ContactFields
        return (
          <div key={n} className="space-y-3 pb-4 border-b border-[#130426]/10 last:border-0">
            <Field label="Name:" value={contact.name} onChange={(v) => onUpdate(group, n, 'name', v)} onBlur={onBlur} rows={1} />
            <Field label="Phone:" value={contact.phone} onChange={(v) => onUpdate(group, n, 'phone', v)} onBlur={onBlur} rows={1} />
            <Field label="Email:" value={contact.email} onChange={(v) => onUpdate(group, n, 'email', v)} onBlur={onBlur} rows={1} />
            <Field label="Address:" value={contact.address} onChange={(v) => onUpdate(group, n, 'address', v)} onBlur={onBlur} rows={2} />
          </div>
        )
      })}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-[#130426] pt-4 pb-1 border-b border-[#130426]/10">{children}</h2>
}

function Field({ label, value, onChange, onBlur, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; rows?: number }) {
  return (
    <div>
      <label className="block text-[#130426]/80 text-sm mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={rows}
        className="w-full bg-white text-[#130426] placeholder:text-[#130426]/40 px-4 py-3 rounded-lg focus:outline-none"
      />
    </div>
  )
}
