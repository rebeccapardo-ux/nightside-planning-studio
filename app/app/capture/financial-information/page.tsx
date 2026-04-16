'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'

const DOCUMENT_TYPE = 'financial_information'
const DOCUMENT_TITLE = 'Financial Information'

type FormState = {
  // Banks / Credit Cards / Investment
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
  // Retirement
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
  // Outstanding Loans
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

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function FinancialInformationPage() {
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
          setForm({ ...EMPTY_FORM, ...(existing.content as object) })
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
    setForm((prev) => ({ ...prev, [field]: value }))
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
        <h1 className="text-3xl font-bold text-[#f8f4eb] mb-3">Financial Information</h1>
        <p className="text-[#f8f4eb]/70 leading-relaxed">
          You can revisit, edit, or export it in My Materials.
        </p>
      </div>

      <div className="space-y-6">
        <SectionHeading>Banks / Credit Cards / Investment</SectionHeading>

        {([1, 2, 3, 4, 5] as const).map((n) => (
          <div key={n} className="space-y-3 pb-4 border-b border-[#f8f4eb]/10 last:border-0">
            <Field label="Name:" value={form[`bank${n}Name` as keyof FormState]} onChange={(v) => updateField(`bank${n}Name` as keyof FormState, v)} rows={1} />
            <Field label="Type of account:" value={form[`bank${n}TypeOfAccount` as keyof FormState]} onChange={(v) => updateField(`bank${n}TypeOfAccount` as keyof FormState, v)} rows={1} />
            <Field label="Account number:" value={form[`bank${n}AccountNumber` as keyof FormState]} onChange={(v) => updateField(`bank${n}AccountNumber` as keyof FormState, v)} rows={1} />
            <Field label="Contact info:" value={form[`bank${n}ContactInfo` as keyof FormState]} onChange={(v) => updateField(`bank${n}ContactInfo` as keyof FormState, v)} rows={2} />
          </div>
        ))}

        <SectionHeading>Retirement</SectionHeading>

        {([1, 2, 3] as const).map((n) => (
          <div key={n} className="space-y-3 pb-4 border-b border-[#f8f4eb]/10 last:border-0">
            <Field label="Name:" value={form[`retirement${n}Name` as keyof FormState]} onChange={(v) => updateField(`retirement${n}Name` as keyof FormState, v)} rows={1} />
            <Field label="Type of account:" value={form[`retirement${n}TypeOfAccount` as keyof FormState]} onChange={(v) => updateField(`retirement${n}TypeOfAccount` as keyof FormState, v)} rows={1} />
            <Field label="Account number:" value={form[`retirement${n}AccountNumber` as keyof FormState]} onChange={(v) => updateField(`retirement${n}AccountNumber` as keyof FormState, v)} rows={1} />
            <Field label="Contact info:" value={form[`retirement${n}ContactInfo` as keyof FormState]} onChange={(v) => updateField(`retirement${n}ContactInfo` as keyof FormState, v)} rows={2} />
          </div>
        ))}

        <SectionHeading>Outstanding Loans</SectionHeading>

        {([1, 2, 3, 4] as const).map((n) => (
          <div key={n} className="space-y-3 pb-4 border-b border-[#f8f4eb]/10 last:border-0">
            <Field label="Name:" value={form[`loan${n}Name` as keyof FormState]} onChange={(v) => updateField(`loan${n}Name` as keyof FormState, v)} rows={1} />
            <Field label="Amount:" value={form[`loan${n}Amount` as keyof FormState]} onChange={(v) => updateField(`loan${n}Amount` as keyof FormState, v)} rows={1} />
            <Field label="Contact info:" value={form[`loan${n}ContactInfo` as keyof FormState]} onChange={(v) => updateField(`loan${n}ContactInfo` as keyof FormState, v)} rows={2} />
          </div>
        ))}

        <SaveBar saveState={saveState} saveButtonLabel={saveButtonLabel} saveStatusText={saveStatusText} onSave={handleSave} />
      </div>
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
