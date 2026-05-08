'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function PersonalAdminPage() {
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
  const [openSection, setOpenSection] = useState<number | null>(0)
  const [visibleDocCount, setVisibleDocCount] = useState(0)
  const [openDocIndex, setOpenDocIndex] = useState<number | null>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

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
          if (existing.created_at) setLastSavedAt(new Date(existing.created_at))
          const merged = { ...EMPTY_FORM, ...existing.content }
          formRef.current = merged
          setForm(merged)
          const count = DOC_NUMS.filter(n =>
            merged[`otherDoc${n}Name` as keyof FormState] ||
            merged[`otherDoc${n}Location` as keyof FormState] ||
            merged[`otherDoc${n}Instructions` as keyof FormState]
          ).length
          setVisibleDocCount(count)
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

  function toSaveable(f: FormState): Omit<FormState, 'socialInsuranceNumber' | 'healthCardNumber'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { socialInsuranceNumber, healthCardNumber, ...safe } = f
    return safe
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
          .insert({ user_id: user.id, title: DOCUMENT_TITLE, section: 'capture', document_type: DOCUMENT_TYPE, content: toSaveable(currentForm) })
          .select('id')
          .single()
        if (error) { setSaveStatus('error'); return }
        if (created) { entryIdRef.current = created.id; setSavedEntryId(created.id) }
      } else {
        const { error } = await supabase.from('entries').update({ content: toSaveable(currentForm) }).eq('id', entryIdRef.current)
        if (error) { setSaveStatus('error'); return }
      }
      setLastSavedAt(new Date())
      setStatusNow(Date.now())
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
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
    if (diffSeconds < 60) return 'Saved'
    if (diffMinutes < 60) return `Saved ${diffMinutes}m ago`
    if (diffHours < 24) return diffHours === 1 ? 'Saved 1h ago' : `Saved ${diffHours}h ago`
    if (diffDays < 7) return diffDays === 1 ? 'Saved 1 day ago' : `Saved ${diffDays} days ago`
    return diffWeeks === 1 ? 'Saved 1 week ago' : `Saved ${diffWeeks} weeks ago`
  }, [lastSavedAt, statusNow, saveStatus])

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
    <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 96px' }}>

        <div style={{ marginBottom: 24 }}>
          <Breadcrumbs
            theme="light"
            items={[
              { label: 'Plan', href: '/app/materials' },
              { label: 'Personal Admin Info' },
            ]}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 48 }}>
          <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]" style={{ color: '#130426', marginBottom: 0 }}>
            Personal Admin Info
          </h1>
          {savedEntryId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, paddingTop: 8 }}>
              {saveStatusText && (
                <span style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777' }}>{saveStatusText}</span>
              )}
              <button type="button" onClick={handlePreviewExport} disabled={saveStatus === 'saving'}
                style={{ fontFamily: hv, fontSize: 14, fontWeight: 500, color: '#2C3777', background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 10, padding: '8px 12px', cursor: saveStatus === 'saving' ? 'default' : 'pointer' }}
                onMouseEnter={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) e.currentTarget.style.background = '#F8F4EB' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#2C3777' }}
                onMouseDown={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) e.currentTarget.style.borderColor = '#130426' }}
                onMouseUp={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) e.currentTarget.style.borderColor = '#2C3777' }}>
                {saveStatus === 'saving' ? 'Preparing…' : 'Finalize and export'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Section 0: Biographical Details ── */}
          <AccordionSection
            idx={0}
            open={openSection === 0}
            onToggle={toggleSection}
            def={SECTION_DEFS[0]}
            saveStatusText={openSection === 0 ? saveStatusText : null}
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
            <Field label="Employment status (circle one): Employed/Unemployed/Self-employed/Small business owner" value={form.employmentStatus} onChange={(v) => updateField('employmentStatus', v)} onBlur={handleBlur} rows={2} />
            <Field label="Employer's name, address, and phone #:" value={form.employerDetails} onChange={(v) => updateField('employerDetails', v)} onBlur={handleBlur} rows={3} />
          </AccordionSection>

          {/* ── Section 1: Family Information ── */}
          <AccordionSection
            idx={1}
            open={openSection === 1}
            onToggle={toggleSection}
            def={SECTION_DEFS[1]}
            saveStatusText={openSection === 1 ? saveStatusText : null}
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
            saveStatusText={openSection === 2 ? saveStatusText : null}
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
            saveStatusText={openSection === 3 ? saveStatusText : null}
            sectionRef={(el) => { sectionRefs.current[3] = el }}
            withPanel
          >
            <Field label="My will is located:" value={form.willLocation} onChange={(v) => updateField('willLocation', v)} onBlur={handleBlur} rows={3} />
            <Field label="I have formally designated decision-maker/s for care:" value={form.hasCareDecisionMaker} onChange={(v) => updateField('hasCareDecisionMaker', v)} onBlur={handleBlur} rows={2} />
            <Field label="If Yes: That document is located:" value={form.careDecisionMakerDocLocation} onChange={(v) => updateField('careDecisionMakerDocLocation', v)} onBlur={handleBlur} rows={3} />
            <Field label="I have captured my wishes for end-of-life care either in writing, e.g. an Advance Directive document, or another format:" value={form.hasEndOfLifeWishesDoc} onChange={(v) => updateField('hasEndOfLifeWishesDoc', v)} onBlur={handleBlur} rows={2} />
            <Field label="If Yes: That document (or other format, e.g. audio recording) is located:" value={form.endOfLifeWishesDocLocation} onChange={(v) => updateField('endOfLifeWishesDocLocation', v)} onBlur={handleBlur} rows={3} />
            <Field label="I have formally designated decision-maker/s for property/finances:" value={form.hasPropertyDecisionMaker} onChange={(v) => updateField('hasPropertyDecisionMaker', v)} onBlur={handleBlur} rows={2} />
            <Field label="If Yes: That document is located:" value={form.propertyDecisionMakerDocLocation} onChange={(v) => updateField('propertyDecisionMakerDocLocation', v)} onBlur={handleBlur} rows={3} />
          </AccordionSection>

          {/* ── Section 4: Other Important Documents ── */}
          <AccordionSection
            idx={4}
            open={openSection === 4}
            onToggle={toggleSection}
            def={SECTION_DEFS[4]}
            saveStatusText={openSection === 4 ? saveStatusText : null}
            sectionRef={(el) => { sectionRefs.current[4] = el }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {DOC_NUMS.slice(0, visibleDocCount).map((n) => {
                const docIdx = n - 1
                const isDocOpen = openDocIndex === docIdx
                const docName = form[`otherDoc${n}Name` as keyof FormState]
                const docTitle = docName.trim() || 'Document'
                return (
                  <div
                    key={n}
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
                        <Field label="Document:" value={form[`otherDoc${n}Name` as keyof FormState]} onChange={(v) => updateField(`otherDoc${n}Name` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
                        <Field label="Location:" value={form[`otherDoc${n}Location` as keyof FormState]} onChange={(v) => updateField(`otherDoc${n}Location` as keyof FormState, v)} onBlur={handleBlur} rows={2} />
                        <Field label="Instructions:" value={form[`otherDoc${n}Instructions` as keyof FormState]} onChange={(v) => updateField(`otherDoc${n}Instructions` as keyof FormState, v)} onBlur={handleBlur} rows={3} />
                      </div>
                    )}
                  </div>
                )
              })}

              {visibleDocCount < 5 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = visibleDocCount + 1
                    setVisibleDocCount(next)
                    setOpenDocIndex(next - 1)
                  }}
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
  saveStatusText,
  sectionRef,
  withPanel = false,
  children,
}: {
  idx: number
  open: boolean
  onToggle: (idx: number) => void
  def: { title: string; description: string }
  saveStatusText: string | null
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
              {saveStatusText && (
                <span style={{ fontFamily: hv, fontSize: 13, color: '#1A1A1A' }}>
                  {saveStatusText}
                </span>
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
      <p style={{ fontFamily: hv, fontSize: 12, color: 'rgba(26,26,26,0.45)', marginTop: 6, lineHeight: 1.4 }}>
        This will be included in your export, but won&apos;t be saved to your plan.
      </p>
    </div>
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
