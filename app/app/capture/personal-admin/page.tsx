'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'

const DOCUMENT_TYPE = 'personal_admin_info'
const DOCUMENT_TITLE = 'Personal Admin Info'

type FormState = {
  // Biographical Details
  fullLegalName: string
  preferredName: string
  pronouns: string
  currentAddress: string
  phoneNumbers: string
  emails: string
  dateOfBirth: string
  placeOfBirth: string
  parent1LegalName: string
  parent1PlaceOfBirth: string
  parent2LegalName: string
  parent2PlaceOfBirth: string
  socialInsuranceNumber: string
  healthCardNumber: string
  maritalStatus: string
  spousePartnerLegalName: string
  numberOfChildren: string
  childrensFullNames: string
  otherFamily: string
  employmentStatus: string
  employerDetails: string
  // End of Life Wishes: Important Documents
  willLocation: string
  hasCareDecisionMaker: string
  careDecisionMakerDocLocation: string
  hasEndOfLifeWishesDoc: string
  endOfLifeWishesDocLocation: string
  hasPropertyDecisionMaker: string
  propertyDecisionMakerDocLocation: string
  // Other Important Documents (5 slots)
  otherDoc1Name: string
  otherDoc1Location: string
  otherDoc1Instructions: string
  otherDoc2Name: string
  otherDoc2Location: string
  otherDoc2Instructions: string
  otherDoc3Name: string
  otherDoc3Location: string
  otherDoc3Instructions: string
  otherDoc4Name: string
  otherDoc4Location: string
  otherDoc4Instructions: string
  otherDoc5Name: string
  otherDoc5Location: string
  otherDoc5Instructions: string
}

const EMPTY_FORM: FormState = {
  fullLegalName: '', preferredName: '', pronouns: '', currentAddress: '',
  phoneNumbers: '', emails: '', dateOfBirth: '', placeOfBirth: '',
  parent1LegalName: '', parent1PlaceOfBirth: '', parent2LegalName: '', parent2PlaceOfBirth: '',
  socialInsuranceNumber: '', healthCardNumber: '', maritalStatus: '', spousePartnerLegalName: '',
  numberOfChildren: '', childrensFullNames: '', otherFamily: '', employmentStatus: '', employerDetails: '',
  willLocation: '', hasCareDecisionMaker: '', careDecisionMakerDocLocation: '',
  hasEndOfLifeWishesDoc: '', endOfLifeWishesDocLocation: '',
  hasPropertyDecisionMaker: '', propertyDecisionMakerDocLocation: '',
  otherDoc1Name: '', otherDoc1Location: '', otherDoc1Instructions: '',
  otherDoc2Name: '', otherDoc2Location: '', otherDoc2Instructions: '',
  otherDoc3Name: '', otherDoc3Location: '', otherDoc3Instructions: '',
  otherDoc4Name: '', otherDoc4Location: '', otherDoc4Instructions: '',
  otherDoc5Name: '', otherDoc5Location: '', otherDoc5Instructions: '',
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function PersonalAdminPage() {
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
          setForm({ ...EMPTY_FORM, ...existing.content })
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
        <h1 className="text-3xl font-bold text-[#f8f4eb] mb-3">Personal Admin Info</h1>
        <p className="text-[#f8f4eb]/70 leading-relaxed">
          You can revisit, edit, or export it in My Materials.
        </p>
      </div>

      <div className="space-y-6">
        <SectionHeading>Biographical Details</SectionHeading>

        <Field label="My full legal name:" value={form.fullLegalName} onChange={(v) => updateField('fullLegalName', v)} rows={2} />
        <Field label="My preferred name:" value={form.preferredName} onChange={(v) => updateField('preferredName', v)} rows={2} />
        <Field label="My pronouns:" value={form.pronouns} onChange={(v) => updateField('pronouns', v)} rows={2} />
        <Field label="My current address:" value={form.currentAddress} onChange={(v) => updateField('currentAddress', v)} rows={3} />
        <Field label="My phone number(s)" value={form.phoneNumbers} onChange={(v) => updateField('phoneNumbers', v)} rows={2} />
        <Field label="My email(s)" value={form.emails} onChange={(v) => updateField('emails', v)} rows={2} />
        <Field label="My date of birth:" value={form.dateOfBirth} onChange={(v) => updateField('dateOfBirth', v)} rows={2} />
        <Field label="My place of birth:" value={form.placeOfBirth} onChange={(v) => updateField('placeOfBirth', v)} rows={2} />
        <Field label="My 1st parent's legal name:" value={form.parent1LegalName} onChange={(v) => updateField('parent1LegalName', v)} rows={2} />
        <Field label="My 1st parent's place of birth:" value={form.parent1PlaceOfBirth} onChange={(v) => updateField('parent1PlaceOfBirth', v)} rows={2} />
        <Field label="My 2nd parent's legal name:" value={form.parent2LegalName} onChange={(v) => updateField('parent2LegalName', v)} rows={2} />
        <Field label="My 2nd parent's place of birth:" value={form.parent2PlaceOfBirth} onChange={(v) => updateField('parent2PlaceOfBirth', v)} rows={2} />
        <Field label="My Social Insurance Number:" value={form.socialInsuranceNumber} onChange={(v) => updateField('socialInsuranceNumber', v)} rows={2} />
        <Field label="My health card number:" value={form.healthCardNumber} onChange={(v) => updateField('healthCardNumber', v)} rows={2} />
        <Field label="My marital status (circle one): Single/Married/Common Law Partner/Divorced/Widowed" value={form.maritalStatus} onChange={(v) => updateField('maritalStatus', v)} rows={2} />
        <Field label="My spouse/partner's legal name:" value={form.spousePartnerLegalName} onChange={(v) => updateField('spousePartnerLegalName', v)} rows={2} />
        <Field label="Number of children (if any):" value={form.numberOfChildren} onChange={(v) => updateField('numberOfChildren', v)} rows={2} />
        <Field label="Children's full names:" value={form.childrensFullNames} onChange={(v) => updateField('childrensFullNames', v)} rows={3} />
        <Field label="Other family:" value={form.otherFamily} onChange={(v) => updateField('otherFamily', v)} rows={3} />
        <Field label="Employment status (circle one): Employed/Unemployed/Self-employed/Small business owner" value={form.employmentStatus} onChange={(v) => updateField('employmentStatus', v)} rows={2} />
        <Field label="Employer's name, address, and phone #:" value={form.employerDetails} onChange={(v) => updateField('employerDetails', v)} rows={3} />

        <SectionHeading>End of Life Wishes: Important Documents</SectionHeading>

        <Field label="My will is located:" value={form.willLocation} onChange={(v) => updateField('willLocation', v)} rows={3} />
        <Field label="I have formally designated decision-maker/s for care:" value={form.hasCareDecisionMaker} onChange={(v) => updateField('hasCareDecisionMaker', v)} rows={2} />
        <Field label="If Yes: That document is located:" value={form.careDecisionMakerDocLocation} onChange={(v) => updateField('careDecisionMakerDocLocation', v)} rows={3} />
        <Field label="I have captured my wishes for end-of-life care either in writing, e.g. an Advance Directive document, or another format:" value={form.hasEndOfLifeWishesDoc} onChange={(v) => updateField('hasEndOfLifeWishesDoc', v)} rows={2} />
        <Field label="If Yes: That document (or other format, e.g. audio recording) is located:" value={form.endOfLifeWishesDocLocation} onChange={(v) => updateField('endOfLifeWishesDocLocation', v)} rows={3} />
        <Field label="I have formally designated decision-maker/s for property/finances:" value={form.hasPropertyDecisionMaker} onChange={(v) => updateField('hasPropertyDecisionMaker', v)} rows={2} />
        <Field label="If Yes: That document is located:" value={form.propertyDecisionMakerDocLocation} onChange={(v) => updateField('propertyDecisionMakerDocLocation', v)} rows={3} />

        <SectionHeading>Other Important Documents</SectionHeading>

        {([1, 2, 3, 4, 5] as const).map((n) => (
          <div key={n} className="space-y-3 pb-4 border-b border-[#f8f4eb]/10 last:border-0">
            <Field label="Document:" value={form[`otherDoc${n}Name` as keyof FormState]} onChange={(v) => updateField(`otherDoc${n}Name` as keyof FormState, v)} rows={2} />
            <Field label="Location:" value={form[`otherDoc${n}Location` as keyof FormState]} onChange={(v) => updateField(`otherDoc${n}Location` as keyof FormState, v)} rows={2} />
            <Field label="Instructions:" value={form[`otherDoc${n}Instructions` as keyof FormState]} onChange={(v) => updateField(`otherDoc${n}Instructions` as keyof FormState, v)} rows={3} />
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
