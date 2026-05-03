'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

const DOCUMENT_TYPE = 'personal_admin_info'
const DOCUMENT_TITLE = 'Personal Admin Info'

type FormState = {
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
  willLocation: string
  hasCareDecisionMaker: string
  careDecisionMakerDocLocation: string
  hasEndOfLifeWishesDoc: string
  endOfLifeWishesDocLocation: string
  hasPropertyDecisionMaker: string
  propertyDecisionMakerDocLocation: string
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

export default function PersonalAdminPage() {
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
          const merged = { ...EMPTY_FORM, ...existing.content }
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
              { label: 'Personal Admin Info' },
            ]}
          />
        </div>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#130426] mb-3">Personal Admin Info</h1>
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
          <SectionHeading>Biographical Details</SectionHeading>

          <Field label="My full legal name:" value={form.fullLegalName} onChange={(v) => updateField('fullLegalName', v)} onBlur={handleBlur} rows={2} />
          <Field label="My preferred name:" value={form.preferredName} onChange={(v) => updateField('preferredName', v)} onBlur={handleBlur} rows={2} />
          <Field label="My pronouns:" value={form.pronouns} onChange={(v) => updateField('pronouns', v)} onBlur={handleBlur} rows={2} />
          <Field label="My current address:" value={form.currentAddress} onChange={(v) => updateField('currentAddress', v)} onBlur={handleBlur} rows={3} />
          <Field label="My phone number(s)" value={form.phoneNumbers} onChange={(v) => updateField('phoneNumbers', v)} onBlur={handleBlur} rows={2} />
          <Field label="My email(s)" value={form.emails} onChange={(v) => updateField('emails', v)} onBlur={handleBlur} rows={2} />
          <Field label="My date of birth:" value={form.dateOfBirth} onChange={(v) => updateField('dateOfBirth', v)} onBlur={handleBlur} rows={2} />
          <Field label="My place of birth:" value={form.placeOfBirth} onChange={(v) => updateField('placeOfBirth', v)} onBlur={handleBlur} rows={2} />
          <Field label="My 1st parent's legal name:" value={form.parent1LegalName} onChange={(v) => updateField('parent1LegalName', v)} onBlur={handleBlur} rows={2} />
          <Field label="My 1st parent's place of birth:" value={form.parent1PlaceOfBirth} onChange={(v) => updateField('parent1PlaceOfBirth', v)} onBlur={handleBlur} rows={2} />
          <Field label="My 2nd parent's legal name:" value={form.parent2LegalName} onChange={(v) => updateField('parent2LegalName', v)} onBlur={handleBlur} rows={2} />
          <Field label="My 2nd parent's place of birth:" value={form.parent2PlaceOfBirth} onChange={(v) => updateField('parent2PlaceOfBirth', v)} onBlur={handleBlur} rows={2} />
          <Field label="My Social Insurance Number:" value={form.socialInsuranceNumber} onChange={(v) => updateField('socialInsuranceNumber', v)} onBlur={handleBlur} rows={2} />
          <Field label="My health card number:" value={form.healthCardNumber} onChange={(v) => updateField('healthCardNumber', v)} onBlur={handleBlur} rows={2} />
          <Field label="My marital status (circle one): Single/Married/Common Law Partner/Divorced/Widowed" value={form.maritalStatus} onChange={(v) => updateField('maritalStatus', v)} onBlur={handleBlur} rows={2} />
          <Field label="My spouse/partner's legal name:" value={form.spousePartnerLegalName} onChange={(v) => updateField('spousePartnerLegalName', v)} onBlur={handleBlur} rows={2} />
          <Field label="Number of children (if any):" value={form.numberOfChildren} onChange={(v) => updateField('numberOfChildren', v)} onBlur={handleBlur} rows={2} />
          <Field label="Children's full names:" value={form.childrensFullNames} onChange={(v) => updateField('childrensFullNames', v)} onBlur={handleBlur} rows={3} />
          <Field label="Other family:" value={form.otherFamily} onChange={(v) => updateField('otherFamily', v)} onBlur={handleBlur} rows={3} />
          <Field label="Employment status (circle one): Employed/Unemployed/Self-employed/Small business owner" value={form.employmentStatus} onChange={(v) => updateField('employmentStatus', v)} onBlur={handleBlur} rows={2} />
          <Field label="Employer's name, address, and phone #:" value={form.employerDetails} onChange={(v) => updateField('employerDetails', v)} onBlur={handleBlur} rows={3} />

          <SectionHeading>End of Life Wishes: Important Documents</SectionHeading>

          <Field label="My will is located:" value={form.willLocation} onChange={(v) => updateField('willLocation', v)} onBlur={handleBlur} rows={3} />
          <Field label="I have formally designated decision-maker/s for care:" value={form.hasCareDecisionMaker} onChange={(v) => updateField('hasCareDecisionMaker', v)} onBlur={handleBlur} rows={2} />
          <Field label="If Yes: That document is located:" value={form.careDecisionMakerDocLocation} onChange={(v) => updateField('careDecisionMakerDocLocation', v)} onBlur={handleBlur} rows={3} />
          <Field label="I have captured my wishes for end-of-life care either in writing, e.g. an Advance Directive document, or another format:" value={form.hasEndOfLifeWishesDoc} onChange={(v) => updateField('hasEndOfLifeWishesDoc', v)} onBlur={handleBlur} rows={2} />
          <Field label="If Yes: That document (or other format, e.g. audio recording) is located:" value={form.endOfLifeWishesDocLocation} onChange={(v) => updateField('endOfLifeWishesDocLocation', v)} onBlur={handleBlur} rows={3} />
          <Field label="I have formally designated decision-maker/s for property/finances:" value={form.hasPropertyDecisionMaker} onChange={(v) => updateField('hasPropertyDecisionMaker', v)} onBlur={handleBlur} rows={2} />
          <Field label="If Yes: That document is located:" value={form.propertyDecisionMakerDocLocation} onChange={(v) => updateField('propertyDecisionMakerDocLocation', v)} onBlur={handleBlur} rows={3} />

          <SectionHeading>Other Important Documents</SectionHeading>

          {([1, 2, 3, 4, 5] as const).map((n) => (
            <div key={n} className="space-y-3 pb-4 border-b border-[#130426]/10 last:border-0">
              <Field label="Document:" value={form[`otherDoc${n}Name` as keyof FormState]} onChange={(v) => updateField(`otherDoc${n}Name` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
              <Field label="Location:" value={form[`otherDoc${n}Location` as keyof FormState]} onChange={(v) => updateField(`otherDoc${n}Location` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
              <Field label="Instructions:" value={form[`otherDoc${n}Instructions` as keyof FormState]} onChange={(v) => updateField(`otherDoc${n}Instructions` as keyof FormState, v)} onBlur={handleBlur} rows={3} />
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
