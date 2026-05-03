'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

const DOCUMENT_TYPE = 'devices_and_accounts'
const DOCUMENT_TITLE = 'Devices & Accounts'

type FormState = {
  device1Name: string
  device1PasswordPin: string
  device1Notes: string
  device2Name: string
  device2PasswordPin: string
  device2Notes: string
  device3Name: string
  device3PasswordPin: string
  device3Notes: string
  device4Name: string
  device4PasswordPin: string
  device4Notes: string
  device5Name: string
  device5PasswordPin: string
  device5Notes: string
  socialMedia1Platform: string
  socialMedia1Username: string
  socialMedia1Password: string
  socialMedia1WishesOnDeath: string
  socialMedia2Platform: string
  socialMedia2Username: string
  socialMedia2Password: string
  socialMedia2WishesOnDeath: string
  socialMedia3Platform: string
  socialMedia3Username: string
  socialMedia3Password: string
  socialMedia3WishesOnDeath: string
  socialMedia4Platform: string
  socialMedia4Username: string
  socialMedia4Password: string
  socialMedia4WishesOnDeath: string
  socialMedia5Platform: string
  socialMedia5Username: string
  socialMedia5Password: string
  socialMedia5WishesOnDeath: string
  otherAccount1Name: string
  otherAccount1Username: string
  otherAccount1Password: string
  otherAccount1Notes: string
  otherAccount2Name: string
  otherAccount2Username: string
  otherAccount2Password: string
  otherAccount2Notes: string
  otherAccount3Name: string
  otherAccount3Username: string
  otherAccount3Password: string
  otherAccount3Notes: string
  otherAccount4Name: string
  otherAccount4Username: string
  otherAccount4Password: string
  otherAccount4Notes: string
  otherAccount5Name: string
  otherAccount5Username: string
  otherAccount5Password: string
  otherAccount5Notes: string
}

const EMPTY_FORM: FormState = {
  device1Name: '', device1PasswordPin: '', device1Notes: '',
  device2Name: '', device2PasswordPin: '', device2Notes: '',
  device3Name: '', device3PasswordPin: '', device3Notes: '',
  device4Name: '', device4PasswordPin: '', device4Notes: '',
  device5Name: '', device5PasswordPin: '', device5Notes: '',
  socialMedia1Platform: '', socialMedia1Username: '', socialMedia1Password: '', socialMedia1WishesOnDeath: '',
  socialMedia2Platform: '', socialMedia2Username: '', socialMedia2Password: '', socialMedia2WishesOnDeath: '',
  socialMedia3Platform: '', socialMedia3Username: '', socialMedia3Password: '', socialMedia3WishesOnDeath: '',
  socialMedia4Platform: '', socialMedia4Username: '', socialMedia4Password: '', socialMedia4WishesOnDeath: '',
  socialMedia5Platform: '', socialMedia5Username: '', socialMedia5Password: '', socialMedia5WishesOnDeath: '',
  otherAccount1Name: '', otherAccount1Username: '', otherAccount1Password: '', otherAccount1Notes: '',
  otherAccount2Name: '', otherAccount2Username: '', otherAccount2Password: '', otherAccount2Notes: '',
  otherAccount3Name: '', otherAccount3Username: '', otherAccount3Password: '', otherAccount3Notes: '',
  otherAccount4Name: '', otherAccount4Username: '', otherAccount4Password: '', otherAccount4Notes: '',
  otherAccount5Name: '', otherAccount5Username: '', otherAccount5Password: '', otherAccount5Notes: '',
}

export default function DevicesAndAccountsPage() {
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
          const merged = { ...EMPTY_FORM, ...(existing.content as object) }
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

  function updateField(field: keyof FormState, value: string) {
    const newForm = { ...formRef.current, [field]: value }
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
              { label: 'Devices & Accounts' },
            ]}
          />
        </div>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#130426] mb-3">Devices & Accounts</h1>
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
          <SectionHeading>Devices and Accounts</SectionHeading>

          {([1, 2, 3, 4, 5] as const).map((n) => (
            <div key={n} className="space-y-3 pb-4 border-b border-[#130426]/10 last:border-0">
              <Field label="Device:" value={form[`device${n}Name` as keyof FormState]} onChange={(v) => updateField(`device${n}Name` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Password/PIN:" value={form[`device${n}PasswordPin` as keyof FormState]} onChange={(v) => updateField(`device${n}PasswordPin` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Notes:" value={form[`device${n}Notes` as keyof FormState]} onChange={(v) => updateField(`device${n}Notes` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
            </div>
          ))}

          <SectionHeading>Social Media</SectionHeading>

          {([1, 2, 3, 4, 5] as const).map((n) => (
            <div key={n} className="space-y-3 pb-4 border-b border-[#130426]/10 last:border-0">
              <Field label="Platform:" value={form[`socialMedia${n}Platform` as keyof FormState]} onChange={(v) => updateField(`socialMedia${n}Platform` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Username:" value={form[`socialMedia${n}Username` as keyof FormState]} onChange={(v) => updateField(`socialMedia${n}Username` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Password:" value={form[`socialMedia${n}Password` as keyof FormState]} onChange={(v) => updateField(`socialMedia${n}Password` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="My wishes on death:" value={form[`socialMedia${n}WishesOnDeath` as keyof FormState]} onChange={(v) => updateField(`socialMedia${n}WishesOnDeath` as keyof FormState, v)} onBlur={handleBlur} rows={3} />
            </div>
          ))}

          <SectionHeading>Other Accounts</SectionHeading>

          {([1, 2, 3, 4, 5] as const).map((n) => (
            <div key={n} className="space-y-3 pb-4 border-b border-[#130426]/10 last:border-0">
              <Field label="Account:" value={form[`otherAccount${n}Name` as keyof FormState]} onChange={(v) => updateField(`otherAccount${n}Name` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Username:" value={form[`otherAccount${n}Username` as keyof FormState]} onChange={(v) => updateField(`otherAccount${n}Username` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Password:" value={form[`otherAccount${n}Password` as keyof FormState]} onChange={(v) => updateField(`otherAccount${n}Password` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Notes:" value={form[`otherAccount${n}Notes` as keyof FormState]} onChange={(v) => updateField(`otherAccount${n}Notes` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
            </div>
          ))}
        </div>
      </div>
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
