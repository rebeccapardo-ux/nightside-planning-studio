'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { DOCUMENT_TYPE_META } from '@/lib/content-metadata'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import ExportFieldHelper from '@/app/components/ExportFieldHelper'
import AutosaveNotice from '@/app/components/AutosaveNotice'

const DOCUMENT_TYPE = DOCUMENT_TYPE_META.personal_admin_info.code
const DOCUMENT_TITLE = DOCUMENT_TYPE_META.personal_admin_info.label

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
  hasWill: boolean
  willLocation: string
  hasCareDecisionMaker: boolean
  careDecisionMakerDocLocation: string
  careDecisionMaker1Name: string
  careDecisionMaker1Phone: string
  careDecisionMaker1Email: string
  careDecisionMaker2Name: string
  careDecisionMaker2Phone: string
  careDecisionMaker2Email: string
  hasEndOfLifeWishesDoc: boolean
  endOfLifeWishesDocLocation: string
  hasPropertyDecisionMaker: boolean
  propertyDecisionMakerDocLocation: string
  propertyDecisionMaker1Name: string
  propertyDecisionMaker1Phone: string
  propertyDecisionMaker1Email: string
  propertyDecisionMaker2Name: string
  propertyDecisionMaker2Phone: string
  propertyDecisionMaker2Email: string
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
  hasWill: false, willLocation: '',
  hasCareDecisionMaker: false, careDecisionMakerDocLocation: '',
  careDecisionMaker1Name: '', careDecisionMaker1Phone: '', careDecisionMaker1Email: '',
  careDecisionMaker2Name: '', careDecisionMaker2Phone: '', careDecisionMaker2Email: '',
  hasEndOfLifeWishesDoc: false, endOfLifeWishesDocLocation: '',
  hasPropertyDecisionMaker: false, propertyDecisionMakerDocLocation: '',
  propertyDecisionMaker1Name: '', propertyDecisionMaker1Phone: '', propertyDecisionMaker1Email: '',
  propertyDecisionMaker2Name: '', propertyDecisionMaker2Phone: '', propertyDecisionMaker2Email: '',
  otherDoc1Name: '', otherDoc1Location: '', otherDoc1Instructions: '',
  otherDoc2Name: '', otherDoc2Location: '', otherDoc2Instructions: '',
  otherDoc3Name: '', otherDoc3Location: '', otherDoc3Instructions: '',
  otherDoc4Name: '', otherDoc4Location: '', otherDoc4Instructions: '',
  otherDoc5Name: '', otherDoc5Location: '', otherDoc5Instructions: '',
}

const afG = "'Apfel Grotezk', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const SECTION_DEFS = [
  { title: 'Biographical Details',       description: 'Basic personal and contact information' },
  { title: 'Family Information for Official Records', description: 'Some official forms may ask for this information. Include what you know or what applies.' },
  { title: 'Identification & Health',     description: 'Key identification and health numbers' },
  { title: 'Legal & Decision-Making',     description: 'Designations and supporting documents' },
  { title: 'Other Important Documents',   description: 'Additional documents, locations, and instructions' },
]

const DOC_NUMS = [1, 2, 3, 4, 5] as const

function PersonalAdminPage() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const formRef = useRef<FormState>(EMPTY_FORM)
  const entryIdRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(Date.now())
  const router = useRouter()
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)
  const [openSection, setOpenSection] = useState<number | null>(
    searchParams.get('section') === 'legal' ? 3 : null
  )
  const [visibleDocCount, setVisibleDocCount] = useState(0)
  // Ref mirror so add + blur-discard arithmetic composes synchronously (race-safe).
  const visibleDocCountRef = useRef(0)
  const [openDocIndex, setOpenDocIndex] = useState<number | null>(null)
  const [showSecondCareDecisionMaker, setShowSecondCareDecisionMaker] = useState(false)
  const [showSecondPropertyDecisionMaker, setShowSecondPropertyDecisionMaker] = useState(false)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastEditedSectionIdxRef = useRef<number | null>(null)
  const [savingSectionIdx, setSavingSectionIdx] = useState<number | null>(null)
  const [savedSectionIdx, setSavedSectionIdx] = useState<number | null>(null)
  const [savedSectionFading, setSavedSectionFading] = useState(false)
  const [persistSectionIdx, setPersistSectionIdx] = useState<number | null>(null)
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLegalEntry = searchParams.get('section') === 'legal'

  useEffect(() => {
    if (!isLegalEntry) window.scrollTo(0, 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
          setSavedEntryId(existing.id)
          const storedSave = localStorage.getItem(`nightside.lastSaved.${user.id}.${existing.id}`)
          const savedDate = storedSave ? new Date(storedSave) : existing.created_at ? new Date(existing.created_at) : null
          if (savedDate) setLastSavedAt(savedDate)

          // Start from entries content, then apply any sync flags set by the domain page
          let merged = { ...EMPTY_FORM, ...existing.content } as FormState
          const meta = user.user_metadata ?? {}
          let syncedFromMeta = false
          if (typeof meta.sync_has_will === 'boolean' && meta.sync_has_will !== merged.hasWill) {
            merged = { ...merged, hasWill: meta.sync_has_will }
            syncedFromMeta = true
          }
          if (typeof meta.sync_has_care_decision_maker === 'boolean' && meta.sync_has_care_decision_maker !== merged.hasCareDecisionMaker) {
            merged = { ...merged, hasCareDecisionMaker: meta.sync_has_care_decision_maker }
            syncedFromMeta = true
          }
          if (typeof meta.sync_has_eol_wishes_doc === 'boolean' && meta.sync_has_eol_wishes_doc !== merged.hasEndOfLifeWishesDoc) {
            merged = { ...merged, hasEndOfLifeWishesDoc: meta.sync_has_eol_wishes_doc }
            syncedFromMeta = true
          }

          formRef.current = merged
          setForm(merged)
          const count = DOC_NUMS.filter(n =>
            merged[`otherDoc${n}Name` as keyof FormState] ||
            merged[`otherDoc${n}Location` as keyof FormState] ||
            merged[`otherDoc${n}Instructions` as keyof FormState]
          ).length
          setVisibleDocCount(count); visibleDocCountRef.current = count
          setShowSecondCareDecisionMaker(
            !!(merged.careDecisionMaker2Name || merged.careDecisionMaker2Phone || merged.careDecisionMaker2Email)
          )
          setShowSecondPropertyDecisionMaker(
            !!(merged.propertyDecisionMaker2Name || merged.propertyDecisionMaker2Phone || merged.propertyDecisionMaker2Email)
          )
          if (syncedFromMeta) {
            supabase.from('entries').update({ content: toSaveable(merged) }).eq('id', existing.id).then(() => {}, () => {})
          }
          supabase.auth.updateUser({
            data: {
              sync_has_will: merged.hasWill,
              sync_has_care_decision_maker: merged.hasCareDecisionMaker,
              sync_has_eol_wishes_doc: merged.hasEndOfLifeWishesDoc,
            },
          }).catch(() => {})
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!isLegalEntry || loading) return
    const timer = setTimeout(() => {
      const el = sectionRefs.current[3]
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 96
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [loading, isLegalEntry])

  useEffect(() => {
    if (!lastSavedAt) return
    const interval = window.setInterval(() => setStatusNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [lastSavedAt])

  type BooleanKey = 'hasWill' | 'hasCareDecisionMaker' | 'hasEndOfLifeWishesDoc' | 'hasPropertyDecisionMaker'

  function updateField(field: keyof FormState, value: string) {
    const newForm = { ...formRef.current, [field]: value } as FormState
    formRef.current = newForm
    setForm(newForm)
    scheduleAutosave()
  }

  function updateBoolField(field: BooleanKey, value: boolean) {
    const newForm = { ...formRef.current, [field]: value } as FormState
    formRef.current = newForm
    setForm(newForm)
    scheduleAutosave()
  }

  function handleRemoveSecondDecisionMaker() {
    const newForm = {
      ...formRef.current,
      careDecisionMaker2Name: '',
      careDecisionMaker2Phone: '',
      careDecisionMaker2Email: '',
    }
    formRef.current = newForm
    setForm(newForm)
    setShowSecondCareDecisionMaker(false)
    scheduleAutosave()
  }

  function handleRemoveSecondPropertyDecisionMaker() {
    const newForm = {
      ...formRef.current,
      propertyDecisionMaker2Name: '',
      propertyDecisionMaker2Phone: '',
      propertyDecisionMaker2Email: '',
    }
    formRef.current = newForm
    setForm(newForm)
    setShowSecondPropertyDecisionMaker(false)
    scheduleAutosave()
  }

  function isDocEmpty(f: FormState, n: number) {
    const r = f as unknown as Record<string, string>
    return !r[`otherDoc${n}Name`]?.trim() && !r[`otherDoc${n}Location`]?.trim() && !r[`otherDoc${n}Instructions`]?.trim()
  }

  function addDocument() {
    const next = visibleDocCountRef.current + 1
    visibleDocCountRef.current = next
    setVisibleDocCount(next)
    setOpenDocIndex(next - 1)
  }

  // Discard the trailing doc slot if it was added but left empty (fires on the
  // doc card's blur). Only the trailing slot, so a filled doc above is untouched.
  function discardEmptyTrailingDoc(n: number) {
    if (n !== visibleDocCountRef.current) return
    const newForm = { ...formRef.current } as unknown as Record<string, string>
    newForm[`otherDoc${n}Name`] = ''
    newForm[`otherDoc${n}Location`] = ''
    newForm[`otherDoc${n}Instructions`] = ''
    formRef.current = newForm as unknown as FormState
    setForm(formRef.current)
    visibleDocCountRef.current = n - 1
    setVisibleDocCount(n - 1)
    setOpenDocIndex(prev => (prev === n - 1 ? null : prev))
    scheduleAutosave()
  }

  function scheduleAutosave() {
    lastEditedSectionIdxRef.current = openSection
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { debounceRef.current = null; performAutosave() }, 1500)
  }

  function handleBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      performAutosave()
    }
  }

  function triggerSavedIndicator(idx: number | null) {
    if (idx === null) return
    if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current)
    setPersistSectionIdx(idx)
    setSavedSectionIdx(idx)
    setSavedSectionFading(false)
    savedFadeTimerRef.current = setTimeout(() => {
      setSavedSectionFading(true)
      setTimeout(() => setSavedSectionIdx(null), 400)
    }, 2600)
  }

  function toSaveable(f: FormState): Omit<FormState, 'socialInsuranceNumber' | 'healthCardNumber'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { socialInsuranceNumber, healthCardNumber, ...safe } = f
    return safe
  }

  async function performAutosave() {
    const targetIdx = lastEditedSectionIdxRef.current
    const currentForm = formRef.current
    setSaveStatus('saving')
    setSavingSectionIdx(targetIdx)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setSaveStatus('error'); setSavingSectionIdx(null); return }

      if (!entryIdRef.current) {
        const { data: created, error } = await supabase
          .from('entries')
          .insert({ user_id: user.id, title: DOCUMENT_TITLE, section: 'capture', document_type: DOCUMENT_TYPE, content: toSaveable(currentForm) })
          .select('id')
          .single()
        if (error) { setSaveStatus('error'); setSavingSectionIdx(null); return }
        if (created) { entryIdRef.current = created.id; setSavedEntryId(created.id) }
      } else {
        const { error } = await supabase.from('entries').update({ content: toSaveable(currentForm) }).eq('id', entryIdRef.current)
        if (error) { setSaveStatus('error'); setSavingSectionIdx(null); return }
      }
      supabase.auth.updateUser({
        data: {
          sync_has_will: currentForm.hasWill,
          sync_has_care_decision_maker: currentForm.hasCareDecisionMaker,
          sync_has_eol_wishes_doc: currentForm.hasEndOfLifeWishesDoc,
        },
      }).catch(() => {})
      if (entryIdRef.current) localStorage.setItem(`nightside.lastSaved.${user.id}.${entryIdRef.current}`, new Date().toISOString())
      setLastSavedAt(new Date())
      setStatusNow(Date.now())
      setSaveStatus('saved')
      setSavingSectionIdx(null); triggerSavedIndicator(targetIdx)
    } catch {
      setSaveStatus('error')
      setSavingSectionIdx(null)
    }
  }

  async function handlePreviewExport() {
    const id = entryIdRef.current
    if (!id) return
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      await performAutosave()
    }
    router.push(`/app/entries/${id}`)
  }

  const saveStatusText = useMemo(() => {
    if (saveStatus === 'saving') return 'Saving…'
    if (saveStatus === 'error') return "Couldn't save"
    if (!lastSavedAt) return null
    const diffMs = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffSeconds < 60) return 'Saved just now'
    if (diffMinutes < 60) return `Saved ${diffMinutes}m ago`
    if (diffHours < 24) return diffHours === 1 ? 'Saved 1h ago' : `Saved ${diffHours}h ago`
    if (diffDays < 7) return diffDays === 1 ? 'Saved 1 day ago' : `Saved ${diffDays} days ago`
    return diffWeeks === 1 ? 'Saved 1 week ago' : `Saved ${diffWeeks} weeks ago`
  }, [lastSavedAt, statusNow, saveStatus])

  const sectionSaveText = useMemo(() => {
    if (!lastSavedAt) return null
    const diffMs = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffSeconds < 60) return 'Saved just now'
    if (diffMinutes < 60) return `Saved ${diffMinutes}m ago`
    if (diffHours < 24) return diffHours === 1 ? 'Saved 1h ago' : `Saved ${diffHours}h ago`
    if (diffDays < 7) return diffDays === 1 ? 'Saved 1 day ago' : `Saved ${diffDays} days ago`
    return diffWeeks === 1 ? 'Saved 1 week ago' : `Saved ${diffWeeks} weeks ago`
  }, [lastSavedAt, statusNow])

  function toggleSection(idx: number) {
    const next = openSection === idx ? null : idx
    setOpenSection(next)
    if (next !== null) {
      setTimeout(() => {
        sectionRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', fontFamily: hv, color: '#130426' }}>
        Loading…
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB', position: 'relative' }}>
      {savedEntryId && (
        <div className="capture-export-bar" style={{ position: 'absolute', top: 20, right: 152, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            type="button"
            onClick={handlePreviewExport}
            disabled={saveStatus === 'saving'}
            className="hover:opacity-90 transition-opacity mobile-sticky-export"
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '10px 20px', fontFamily: hv, fontSize: 14, fontWeight: 600, background: '#F29836', color: '#130426', border: 'none', cursor: saveStatus === 'saving' ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: saveStatus === 'saving' ? 0.6 : 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1.5 10.5h10" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {saveStatus === 'saving' ? 'Preparing…' : <><span className="hidden md:inline">Finalize &amp; </span>Export</>}
          </button>
          {saveStatusText && (
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.75)', fontFamily: hv }}>{saveStatusText}</span>
          )}
        </div>
      )}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 96px' }}>

        <div style={{ marginBottom: 24 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Plan', href: '/app/plan' },
              { label: 'Personal Admin Information' },
            ]}
          />
        </div>

        <div style={{ marginBottom: 48 }}>
          <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]" style={{ color: '#130426', marginBottom: 20 }}>
            Personal Admin Information
          </h1>
          <p style={{ fontFamily: hv, fontSize: 18, fontWeight: 400, color: '#130426', lineHeight: 1.6, marginBottom: 16, maxWidth: 600 }}>
            A place to record your basic personal information, family details for official records, and where to find important documents.
          </p>
          <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 400, color: '#130426', lineHeight: 1.6, marginBottom: 16, maxWidth: 600 }}>
            When you&apos;re incapacitated or after you die, the people handling your affairs need basic information about you and your family, and they need to know where to find your important documents. Most people have no idea where their loved ones keep these things. This document gives them a map.
          </p>
          <p style={{ fontFamily: hv, fontSize: 14, color: 'rgba(19,4,38,0.6)', lineHeight: 1.6, marginBottom: 24, maxWidth: 600 }}>
            Identification and health numbers are designed to be added at the moment of export rather than saved to your plan.{' '}
            <a href="/app/help?expanded=privacy" style={{ color: 'rgba(19,4,38,0.6)', textDecoration: 'underline' }}>Learn more about how we handle your information →</a>
          </p>
          <AutosaveNotice>Information you add will save automatically to Your Plan.</AutosaveNotice>
          {saveStatusText && (
            <span className="mobile-saved-status" style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.65)', marginTop: 16, display: 'none' }}>{saveStatusText}</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Section 0: Biographical Details ── */}
          <AccordionSection
            idx={0}
            open={openSection === 0}
            onToggle={toggleSection}
            def={SECTION_DEFS[0]}
            isSaving={savingSectionIdx === 0}
            isSaved={savedSectionIdx === 0}
            savedFading={savedSectionFading}
            persistText={persistSectionIdx === 0 ? sectionSaveText : null}
            sectionRef={(el) => { sectionRefs.current[0] = el }}
            withPanel
          >
            <Field label="My full legal name:" value={form.fullLegalName} onChange={(v) => updateField('fullLegalName', v)} onBlur={handleBlur} rows={2} />
            <Field label="My preferred name:" value={form.preferredName} onChange={(v) => updateField('preferredName', v)} onBlur={handleBlur} rows={2} />
            <Field label="My pronouns:" value={form.pronouns} onChange={(v) => updateField('pronouns', v)} onBlur={handleBlur} rows={2} />
            <Field label="My current address:" value={form.currentAddress} onChange={(v) => updateField('currentAddress', v)} onBlur={handleBlur} rows={3} />
            <Field label="My phone number(s)" value={form.phoneNumbers} onChange={(v) => updateField('phoneNumbers', v)} onBlur={handleBlur} rows={2} />
            <Field label="My email(s)" value={form.emails} onChange={(v) => updateField('emails', v)} onBlur={handleBlur} rows={2} />
            <Field label="My date of birth:" value={form.dateOfBirth} onChange={(v) => updateField('dateOfBirth', v)} onBlur={handleBlur} rows={2} />
            <Field label="My place of birth:" value={form.placeOfBirth} onChange={(v) => updateField('placeOfBirth', v)} onBlur={handleBlur} rows={2} />
            <Field label="Employment status:" value={form.employmentStatus} onChange={(v) => updateField('employmentStatus', v)} onBlur={handleBlur} rows={2} />
            <Field label="Employer's name, address, and phone #:" value={form.employerDetails} onChange={(v) => updateField('employerDetails', v)} onBlur={handleBlur} rows={3} />
          </AccordionSection>

          {/* ── Section 1: Family Information ── */}
          <AccordionSection
            idx={1}
            open={openSection === 1}
            onToggle={toggleSection}
            def={SECTION_DEFS[1]}
            isSaving={savingSectionIdx === 1}
            isSaved={savedSectionIdx === 1}
            savedFading={savedSectionFading}
            persistText={persistSectionIdx === 1 ? sectionSaveText : null}
            sectionRef={(el) => { sectionRefs.current[1] = el }}
            withPanel
          >
            <Field label="Parent / caregiver legal name (if known):" value={form.parent1LegalName} onChange={(v) => updateField('parent1LegalName', v)} onBlur={handleBlur} rows={2} />
            <Field label="Parent / caregiver place of birth (if known):" value={form.parent1PlaceOfBirth} onChange={(v) => updateField('parent1PlaceOfBirth', v)} onBlur={handleBlur} rows={2} />
            <Field label="Second parent / caregiver legal name (if applicable):" value={form.parent2LegalName} onChange={(v) => updateField('parent2LegalName', v)} onBlur={handleBlur} rows={2} />
            <Field label="Second parent / caregiver place of birth (if applicable):" value={form.parent2PlaceOfBirth} onChange={(v) => updateField('parent2PlaceOfBirth', v)} onBlur={handleBlur} rows={2} />
            <Field label="Relationship status for official records (if relevant):" value={form.maritalStatus} onChange={(v) => updateField('maritalStatus', v)} onBlur={handleBlur} rows={2} />
            <Field label="Spouse / partner legal name (if applicable):" value={form.spousePartnerLegalName} onChange={(v) => updateField('spousePartnerLegalName', v)} onBlur={handleBlur} rows={2} />
            <Field label="Number of children (if applicable):" value={form.numberOfChildren} onChange={(v) => updateField('numberOfChildren', v)} onBlur={handleBlur} rows={2} />
            <Field label="Children's full names (if applicable):" value={form.childrensFullNames} onChange={(v) => updateField('childrensFullNames', v)} onBlur={handleBlur} rows={3} />
            <Field label="Other family, chosen family, or important relationships:" value={form.otherFamily} onChange={(v) => updateField('otherFamily', v)} onBlur={handleBlur} rows={3} />
          </AccordionSection>

          {/* ── Section 2: Identification & Health ── */}
          <AccordionSection
            idx={2}
            open={openSection === 2}
            onToggle={toggleSection}
            def={SECTION_DEFS[2]}
            isSaving={savingSectionIdx === 2}
            isSaved={savedSectionIdx === 2}
            savedFading={savedSectionFading}
            persistText={persistSectionIdx === 2 ? sectionSaveText : null}
            sectionRef={(el) => { sectionRefs.current[2] = el }}
            withPanel
          >
            <SensitiveFieldDisplay label="My Social Insurance Number:" />
            <SensitiveFieldDisplay label="My health card number:" />
          </AccordionSection>

          {/* ── Section 3: Legal & Decision-Making ── */}
          <AccordionSection
            idx={3}
            open={openSection === 3}
            onToggle={toggleSection}
            def={SECTION_DEFS[3]}
            isSaving={savingSectionIdx === 3}
            isSaved={savedSectionIdx === 3}
            savedFading={savedSectionFading}
            persistText={persistSectionIdx === 3 ? sectionSaveText : null}
            sectionRef={(el) => { sectionRefs.current[3] = el }}
            withPanel
          >
            <p style={{ fontFamily: hv, fontSize: 15, color: 'rgba(19,4,38,0.65)', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              The designations you record here are for organizing your planning. The binding legal documents themselves are not generated by this platform. For those, consult a lawyer in your province.
            </p>

            {/* Legal Will */}
            <div>
              <CheckboxItem
                label="I have a legal will"
                checked={form.hasWill}
                onChange={(v) => updateBoolField('hasWill', v)}
              />
              {form.hasWill && (
                <div style={{ marginTop: 14, paddingLeft: 30 }}>
                  <Field label="My will is located:" value={form.willLocation} onChange={(v) => updateField('willLocation', v)} onBlur={handleBlur} rows={3} />
                </div>
              )}
            </div>

            {/* Care Decision Maker */}
            <div>
              <CheckboxItem
                label="I have formally designated decision-maker/s for care"
                checked={form.hasCareDecisionMaker}
                onChange={(v) => updateBoolField('hasCareDecisionMaker', v)}
              />
              {form.hasCareDecisionMaker && (
                <div style={{ marginTop: 14, paddingLeft: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label="Document location:" value={form.careDecisionMakerDocLocation} onChange={(v) => updateField('careDecisionMakerDocLocation', v)} onBlur={handleBlur} rows={3} />
                  <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 600, color: '#2C3777', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                    Decision maker details
                  </p>
                  <Field label="Name" value={form.careDecisionMaker1Name} onChange={(v) => updateField('careDecisionMaker1Name', v)} onBlur={handleBlur} rows={2} />
                  <Field label="Phone" value={form.careDecisionMaker1Phone} onChange={(v) => updateField('careDecisionMaker1Phone', v)} onBlur={handleBlur} rows={2} />
                  <Field label="Email" value={form.careDecisionMaker1Email} onChange={(v) => updateField('careDecisionMaker1Email', v)} onBlur={handleBlur} rows={2} />
                  {showSecondCareDecisionMaker ? (
                    <div
                      onBlur={(e) => {
                        // Hide + clear the optional second decision maker if it was
                        // opened but left empty when focus leaves the block.
                        if (!e.currentTarget.contains(e.relatedTarget as Node)
                          && !form.careDecisionMaker2Name.trim()
                          && !form.careDecisionMaker2Phone.trim()
                          && !form.careDecisionMaker2Email.trim()) {
                          handleRemoveSecondDecisionMaker()
                        }
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12, borderTop: '1px solid rgba(187,171,244,0.5)' }}
                    >
                      <Field label="Name" value={form.careDecisionMaker2Name} onChange={(v) => updateField('careDecisionMaker2Name', v)} onBlur={handleBlur} rows={2} />
                      <Field label="Phone" value={form.careDecisionMaker2Phone} onChange={(v) => updateField('careDecisionMaker2Phone', v)} onBlur={handleBlur} rows={2} />
                      <Field label="Email" value={form.careDecisionMaker2Email} onChange={(v) => updateField('careDecisionMaker2Email', v)} onBlur={handleBlur} rows={2} />
                      <button
                        type="button"
                        onClick={handleRemoveSecondDecisionMaker}
                        style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' as const, alignSelf: 'flex-start' as const }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSecondCareDecisionMaker(true)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: '#FFFFFF', border: '1px solid #2C3777',
                        borderRadius: 999, padding: '8px 16px',
                        fontFamily: hv, fontSize: 13, color: '#2C3777', cursor: 'pointer',
                        fontWeight: 500, alignSelf: 'flex-start' as const,
                      }}
                    >
                      + Add second decision maker
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* End-of-Life Wishes */}
            <div>
              <CheckboxItem
                label="I have captured my end-of-life care wishes in writing (e.g. an Advance Directive) or another format"
                checked={form.hasEndOfLifeWishesDoc}
                onChange={(v) => updateBoolField('hasEndOfLifeWishesDoc', v)}
              />
              {form.hasEndOfLifeWishesDoc && (
                <div style={{ marginTop: 14, paddingLeft: 30 }}>
                  <Field label="Document (or other format, e.g. audio recording) location:" value={form.endOfLifeWishesDocLocation} onChange={(v) => updateField('endOfLifeWishesDocLocation', v)} onBlur={handleBlur} rows={3} />
                </div>
              )}
            </div>

            {/* Property / Finances Decision Maker */}
            <div>
              <CheckboxItem
                label="I have formally designated decision-maker/s for property/finances"
                checked={form.hasPropertyDecisionMaker}
                onChange={(v) => updateBoolField('hasPropertyDecisionMaker', v)}
              />
              {form.hasPropertyDecisionMaker && (
                <div style={{ marginTop: 14, paddingLeft: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label="Document location:" value={form.propertyDecisionMakerDocLocation} onChange={(v) => updateField('propertyDecisionMakerDocLocation', v)} onBlur={handleBlur} rows={3} />
                  <p style={{ fontFamily: hv, fontSize: 12, fontWeight: 600, color: '#2C3777', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                    Decision maker details
                  </p>
                  <Field label="Name" value={form.propertyDecisionMaker1Name} onChange={(v) => updateField('propertyDecisionMaker1Name', v)} onBlur={handleBlur} rows={2} />
                  <Field label="Phone" value={form.propertyDecisionMaker1Phone} onChange={(v) => updateField('propertyDecisionMaker1Phone', v)} onBlur={handleBlur} rows={2} />
                  <Field label="Email" value={form.propertyDecisionMaker1Email} onChange={(v) => updateField('propertyDecisionMaker1Email', v)} onBlur={handleBlur} rows={2} />
                  {showSecondPropertyDecisionMaker ? (
                    <div
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)
                          && !form.propertyDecisionMaker2Name.trim()
                          && !form.propertyDecisionMaker2Phone.trim()
                          && !form.propertyDecisionMaker2Email.trim()) {
                          handleRemoveSecondPropertyDecisionMaker()
                        }
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12, borderTop: '1px solid rgba(187,171,244,0.5)' }}
                    >
                      <Field label="Name" value={form.propertyDecisionMaker2Name} onChange={(v) => updateField('propertyDecisionMaker2Name', v)} onBlur={handleBlur} rows={2} />
                      <Field label="Phone" value={form.propertyDecisionMaker2Phone} onChange={(v) => updateField('propertyDecisionMaker2Phone', v)} onBlur={handleBlur} rows={2} />
                      <Field label="Email" value={form.propertyDecisionMaker2Email} onChange={(v) => updateField('propertyDecisionMaker2Email', v)} onBlur={handleBlur} rows={2} />
                      <button
                        type="button"
                        onClick={handleRemoveSecondPropertyDecisionMaker}
                        style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' as const, alignSelf: 'flex-start' as const }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSecondPropertyDecisionMaker(true)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: '#FFFFFF', border: '1px solid #2C3777',
                        borderRadius: 999, padding: '8px 16px',
                        fontFamily: hv, fontSize: 13, color: '#2C3777', cursor: 'pointer',
                        fontWeight: 500, alignSelf: 'flex-start' as const,
                      }}
                    >
                      + Add second decision maker
                    </button>
                  )}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* ── Section 4: Other Important Documents ── */}
          <AccordionSection
            idx={4}
            open={openSection === 4}
            onToggle={toggleSection}
            def={SECTION_DEFS[4]}
            isSaving={savingSectionIdx === 4}
            isSaved={savedSectionIdx === 4}
            savedFading={savedSectionFading}
            persistText={persistSectionIdx === 4 ? sectionSaveText : null}
            sectionRef={(el) => { sectionRefs.current[4] = el }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {DOC_NUMS.slice(0, visibleDocCount).map((n) => {
                const docIdx = n - 1
                const isDocOpen = openDocIndex === docIdx
                const docName = form[`otherDoc${n}Name` as keyof FormState] as string
                const docTitle = docName.trim() || 'Document'
                return (
                  <div
                    key={n}
                    onBlur={(e) => {
                      // Discard a just-added doc left empty when focus leaves the
                      // card (only the trailing slot — see discardEmptyTrailingDoc).
                      if (!e.currentTarget.contains(e.relatedTarget as Node) && isDocEmpty(form, n)) {
                        discardEmptyTrailingDoc(n)
                      }
                    }}
                    style={{
                      border: '1px solid #2C3777',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenDocIndex(isDocOpen ? null : docIdx)}
                      style={{
                        width: '100%',
                        background: '#FFFFFF',
                        border: 'none',
                        padding: '14px 18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', fontWeight: 500 }}>
                        {docTitle}
                      </span>
                      <svg
                        width="12" height="8" viewBox="0 0 12 8" fill="none"
                        style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isDocOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#2C3777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isDocOpen && (
                      <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 20, background: '#FFFFFF', borderTop: `1px solid #BBABF4` }}>
                        <Field label="Document:" value={form[`otherDoc${n}Name` as keyof FormState] as string} onChange={(v) => updateField(`otherDoc${n}Name` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
                        <Field label="Location:" value={form[`otherDoc${n}Location` as keyof FormState] as string} onChange={(v) => updateField(`otherDoc${n}Location` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
                        <Field label="Instructions:" value={form[`otherDoc${n}Instructions` as keyof FormState] as string} onChange={(v) => updateField(`otherDoc${n}Instructions` as keyof FormState, v)} onBlur={handleBlur} rows={3} />
                      </div>
                    )}
                  </div>
                )
              })}

              {visibleDocCount < 5 && (
                <button
                  type="button"
                  onClick={addDocument}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#FFFFFF',
                    border: '1px solid #2C3777',
                    borderRadius: 999,
                    padding: '10px 18px',
                    fontFamily: hv,
                    fontSize: 14,
                    color: '#2C3777',
                    cursor: 'pointer',
                    fontWeight: 500,
                    alignSelf: 'flex-start',
                  }}
                >
                  + Add document
                </button>
              )}
            </div>
          </AccordionSection>

        </div>
      </div>
    </div>
  )
}

// ── AccordionSection ──────────────────────────────────────────────────────────

function AccordionSection({
  idx,
  open,
  onToggle,
  def,
  isSaving,
  isSaved,
  savedFading,
  persistText,
  sectionRef,
  withPanel = false,
  children,
}: {
  idx: number
  open: boolean
  onToggle: (idx: number) => void
  def: { title: string; description: string }
  isSaving: boolean
  isSaved: boolean
  savedFading: boolean
  persistText: string | null
  sectionRef: (el: HTMLDivElement | null) => void
  withPanel?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      ref={sectionRef}
      style={{
        borderRadius: 16,
        border: open ? '2px solid #2C3777' : '1px solid #2C3777',
        overflow: 'hidden',
        background: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex' }}>
        {open && (
          <div style={{ width: 6, background: '#BBABF4', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>

          {/* Header */}
          <button
            type="button"
            onClick={() => onToggle(idx)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: 24,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              textAlign: 'left',
            }}
          >
            <div>
              <p style={{ fontFamily: afG, fontSize: 24, fontWeight: 600, color: '#1A1A1A', margin: 0, lineHeight: 1.2 }}>
                {def.title}
              </p>
              <p style={{ fontFamily: hv, fontSize: 14, color: '#1A1A1A', margin: '4px 0 0 0' }}>
                {def.description}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, paddingTop: 4 }}>
              {isSaving && (
                <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saving…</span>
              )}
              {isSaved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: savedFading ? 0 : 1, transition: 'opacity 0.4s ease' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="6" stroke="rgba(19,4,38,0.65)" strokeWidth="1.3" />
                    <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(19,4,38,0.65)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saved to Your Plan</span>
                </div>
              )}
              {!isSaving && !isSaved && persistText && (
                <span style={{ fontFamily: hv, fontSize: 13, color: '#1A1A1A' }}>{persistText}</span>
              )}
              <svg
                width="14" height="9" viewBox="0 0 14 9" fill="none"
                style={{ flexShrink: 0, transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path d="M1 1.5L7 7.5L13 1.5" stroke="#2C3777" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>

          {/* Content */}
          {open && (
            withPanel ? (
              <div style={{ padding: '0 20px 20px' }}>
                <div style={{ background: '#F8F4EB', borderRadius: 10, padding: 20, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {children}
                </div>
              </div>
            ) : (
              <div style={{ padding: '0 24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {children}
              </div>
            )
          )}

        </div>
      </div>
    </div>
  )
}

export default function Wrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F4EB]" />}>
      <PersonalAdminPage />
    </Suspense>
  )
}

// ── SensitiveFieldDisplay ──────────────────────────────────────────────────────

function SensitiveFieldDisplay({ label }: { label: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>
        {label}
      </label>
      <div
        style={{
          width: '100%',
          background: '#F5F5F5',
          color: 'rgba(26,26,26,0.45)',
          border: '1px solid #BBABF4',
          borderRadius: 10,
          padding: 12,
          fontFamily: hv,
          fontSize: 15,
          lineHeight: 1.5,
          boxSizing: 'border-box' as const,
          cursor: 'default',
        }}
      >
        To be added when finalizing document
      </div>
      <ExportFieldHelper />
    </div>
  )
}

// ── CheckboxItem ──────────────────────────────────────────────────────────────

function CheckboxItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' as const }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 2,
        border: `2px solid ${checked ? '#2C3777' : '#BBABF4'}`,
        background: checked ? '#2C3777' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, border-color 0.15s',
      }}>
        {checked && (
          <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
            <path d="M1 3.5L4 6.5L10 1" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontFamily: hv, fontSize: 15, color: '#1A1A1A', lineHeight: 1.45 }}>{label}</span>
    </button>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, onBlur, rows = 4 }: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  rows?: number
}) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={rows}
        style={{
          width: '100%',
          background: '#FFFFFF',
          color: '#1A1A1A',
          border: '1px solid #BBABF4',
          borderRadius: 10,
          padding: 12,
          fontFamily: hv,
          fontSize: 15,
          lineHeight: 1.5,
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
