'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

const DOCUMENT_TYPE = 'financial_information'
const DOCUMENT_TITLE = 'Financial Information'

type FormState = {
  bank1Name: string
  bank1TypeOfAccount: string
  bank1AccountNumber: string
  bank1ContactInfo: string
  bank2Name: string
  bank2TypeOfAccount: string
  bank2AccountNumber: string
  bank2ContactInfo: string
  bank3Name: string
  bank3TypeOfAccount: string
  bank3AccountNumber: string
  bank3ContactInfo: string
  bank4Name: string
  bank4TypeOfAccount: string
  bank4AccountNumber: string
  bank4ContactInfo: string
  bank5Name: string
  bank5TypeOfAccount: string
  bank5AccountNumber: string
  bank5ContactInfo: string
  retirement1Name: string
  retirement1TypeOfAccount: string
  retirement1AccountNumber: string
  retirement1ContactInfo: string
  retirement2Name: string
  retirement2TypeOfAccount: string
  retirement2AccountNumber: string
  retirement2ContactInfo: string
  retirement3Name: string
  retirement3TypeOfAccount: string
  retirement3AccountNumber: string
  retirement3ContactInfo: string
  loan1Name: string
  loan1Amount: string
  loan1ContactInfo: string
  loan2Name: string
  loan2Amount: string
  loan2ContactInfo: string
  loan3Name: string
  loan3Amount: string
  loan3ContactInfo: string
  loan4Name: string
  loan4Amount: string
  loan4ContactInfo: string
}

const EMPTY_FORM: FormState = {
  bank1Name: '', bank1TypeOfAccount: '', bank1AccountNumber: '', bank1ContactInfo: '',
  bank2Name: '', bank2TypeOfAccount: '', bank2AccountNumber: '', bank2ContactInfo: '',
  bank3Name: '', bank3TypeOfAccount: '', bank3AccountNumber: '', bank3ContactInfo: '',
  bank4Name: '', bank4TypeOfAccount: '', bank4AccountNumber: '', bank4ContactInfo: '',
  bank5Name: '', bank5TypeOfAccount: '', bank5AccountNumber: '', bank5ContactInfo: '',
  retirement1Name: '', retirement1TypeOfAccount: '', retirement1AccountNumber: '', retirement1ContactInfo: '',
  retirement2Name: '', retirement2TypeOfAccount: '', retirement2AccountNumber: '', retirement2ContactInfo: '',
  retirement3Name: '', retirement3TypeOfAccount: '', retirement3AccountNumber: '', retirement3ContactInfo: '',
  loan1Name: '', loan1Amount: '', loan1ContactInfo: '',
  loan2Name: '', loan2Amount: '', loan2ContactInfo: '',
  loan3Name: '', loan3Amount: '', loan3ContactInfo: '',
  loan4Name: '', loan4Amount: '', loan4ContactInfo: '',
}

export default function FinancialInformationPage() {
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
              { label: 'Capture', href: '/app/capture' },
              { label: 'Financial Information' },
            ]}
          />
        </div>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#130426] mb-3">Financial Information</h1>
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
          <SectionHeading>Banks / Credit Cards / Investment</SectionHeading>

          {([1, 2, 3, 4, 5] as const).map((n) => (
            <div key={n} className="space-y-3 pb-4 border-b border-[#130426]/10 last:border-0">
              <Field label="Name:" value={form[`bank${n}Name` as keyof FormState]} onChange={(v) => updateField(`bank${n}Name` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Type of account:" value={form[`bank${n}TypeOfAccount` as keyof FormState]} onChange={(v) => updateField(`bank${n}TypeOfAccount` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Account number:" value={form[`bank${n}AccountNumber` as keyof FormState]} onChange={(v) => updateField(`bank${n}AccountNumber` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Contact info:" value={form[`bank${n}ContactInfo` as keyof FormState]} onChange={(v) => updateField(`bank${n}ContactInfo` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
            </div>
          ))}

          <SectionHeading>Retirement</SectionHeading>

          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="space-y-3 pb-4 border-b border-[#130426]/10 last:border-0">
              <Field label="Name:" value={form[`retirement${n}Name` as keyof FormState]} onChange={(v) => updateField(`retirement${n}Name` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Type of account:" value={form[`retirement${n}TypeOfAccount` as keyof FormState]} onChange={(v) => updateField(`retirement${n}TypeOfAccount` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Account number:" value={form[`retirement${n}AccountNumber` as keyof FormState]} onChange={(v) => updateField(`retirement${n}AccountNumber` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Contact info:" value={form[`retirement${n}ContactInfo` as keyof FormState]} onChange={(v) => updateField(`retirement${n}ContactInfo` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
            </div>
          ))}

          <SectionHeading>Outstanding Loans</SectionHeading>

          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="space-y-3 pb-4 border-b border-[#130426]/10 last:border-0">
              <Field label="Name:" value={form[`loan${n}Name` as keyof FormState]} onChange={(v) => updateField(`loan${n}Name` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Amount:" value={form[`loan${n}Amount` as keyof FormState]} onChange={(v) => updateField(`loan${n}Amount` as keyof FormState, v)} onBlur={handleBlur} rows={1} />
              <Field label="Contact info:" value={form[`loan${n}ContactInfo` as keyof FormState]} onChange={(v) => updateField(`loan${n}ContactInfo` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
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
