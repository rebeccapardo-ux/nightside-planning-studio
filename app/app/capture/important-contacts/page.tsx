'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import AutosaveNotice from '@/app/components/AutosaveNotice'

const DOCUMENT_TYPE = 'important_contacts'
const DOCUMENT_TITLE = 'Important Contacts'
const afG = "'Apfel Grotezk', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContactEntry = {
  id: string
  name: string
  role: string
  institution: string
  phone: string
  email: string
  address: string
}

type SectionKey = 'healthcare' | 'legal' | 'relatives' | 'friends' | 'spiritual' | 'financial' | 'other'

type FormState = Record<SectionKey, ContactEntry[]>

const EMPTY_FORM: FormState = {
  healthcare: [], legal: [], relatives: [], friends: [],
  spiritual: [], financial: [], other: [],
}

function isContactEntryEmpty(e: ContactEntry) {
  return !e.name.trim() && !e.role.trim() && !(e.institution ?? '').trim() && !e.phone.trim() && !e.email.trim() && !e.address.trim()
}

// ---------------------------------------------------------------------------
// Migration from old fixed-field format
// ---------------------------------------------------------------------------

function isOldFormat(content: Record<string, unknown>): boolean {
  return 'doctor1' in content || 'attorney1' in content || 'relative1' in content
}

function migrateContact(raw: unknown): ContactEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name : ''
  const phone = typeof r.phone === 'string' ? r.phone : ''
  const email = typeof r.email === 'string' ? r.email : ''
  const address = typeof r.address === 'string' ? r.address : ''
  if (!name && !phone && !email && !address) return null
  return { id: genId(), name, role: '', institution: '', phone, email, address }
}

function migrateOldFormat(old: Record<string, unknown>): FormState {
  function extractGroup(prefix: string, count: number): ContactEntry[] {
    const entries: ContactEntry[] = []
    for (let n = 1; n <= count; n++) {
      const entry = migrateContact(old[`${prefix}${n}`])
      if (entry) entries.push(entry)
    }
    return entries
  }
  return {
    healthcare: extractGroup('doctor', 4),
    legal: extractGroup('attorney', 4),
    relatives: extractGroup('relative', 4),
    friends: extractGroup('friend', 4),
    spiritual: [],
    financial: [],
    other: extractGroup('other', 4),
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function ImportantContactsPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const formRef = useRef<FormState>(EMPTY_FORM)
  const entryIdRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusNow, setStatusNow] = useState(Date.now())
  const router = useRouter()
  const searchParams = useSearchParams()
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)

  const lastEditedEntryIdRef = useRef<string | null>(null)
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null)
  const [savedIndicatorId, setSavedIndicatorId] = useState<string | null>(null)
  const [savedIndicatorFading, setSavedIndicatorFading] = useState(false)
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sectionParam = searchParams.get('section')
  const isSectionEntry = sectionParam === 'healthcare' || sectionParam === 'legal'
  const [openSection, setOpenSection] = useState<number | null>(
    sectionParam === 'healthcare' ? 0 : sectionParam === 'legal' ? 1 : null
  )
  const [openHealthcareIds, setOpenHealthcareIds] = useState<Set<string>>(new Set())
  const [openLegalIds, setOpenLegalIds] = useState<Set<string>>(new Set())
  const [openRelativesIds, setOpenRelativesIds] = useState<Set<string>>(new Set())
  const [openFriendsIds, setOpenFriendsIds] = useState<Set<string>>(new Set())
  const [openSpiritualIds, setOpenSpiritualIds] = useState<Set<string>>(new Set())
  const [openFinancialIds, setOpenFinancialIds] = useState<Set<string>>(new Set())
  const [openOtherIds, setOpenOtherIds] = useState<Set<string>>(new Set())
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  const openIdSetters: Record<SectionKey, React.Dispatch<React.SetStateAction<Set<string>>>> = {
    healthcare: setOpenHealthcareIds,
    legal: setOpenLegalIds,
    relatives: setOpenRelativesIds,
    friends: setOpenFriendsIds,
    spiritual: setOpenSpiritualIds,
    financial: setOpenFinancialIds,
    other: setOpenOtherIds,
  }

  const openIdSets: Record<SectionKey, Set<string>> = {
    healthcare: openHealthcareIds,
    legal: openLegalIds,
    relatives: openRelativesIds,
    friends: openFriendsIds,
    spiritual: openSpiritualIds,
    financial: openFinancialIds,
    other: openOtherIds,
  }

  useEffect(() => { if (!isSectionEntry) window.scrollTo(0, 0) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSectionEntry || loading) return
    const targetIdx = sectionParam === 'healthcare' ? 0 : 1
    const timer = setTimeout(() => {
      const el = sectionRefs.current[targetIdx]
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 96
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [loading, isSectionEntry]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) return
        const { data: rows, error: loadError } = await supabase
          .from('entries').select('id, content, created_at')
          .eq('user_id', user.id).eq('document_type', DOCUMENT_TYPE)
          .order('created_at', { ascending: false }).limit(1)
        if (loadError) { console.error('LOAD ERROR:', loadError); return }
        const existing = rows?.[0]
        if (existing) {
          entryIdRef.current = existing.id
          setSavedEntryId(existing.id)
          const storedSave = localStorage.getItem(`nightside.lastSaved.${user.id}.${existing.id}`)
          const savedDate = storedSave ? new Date(storedSave) : existing.created_at ? new Date(existing.created_at) : null
          if (savedDate) setLastSavedAt(savedDate)
          const raw = existing.content as Record<string, unknown>
          let loaded: FormState
          if (isOldFormat(raw)) {
            loaded = migrateOldFormat(raw)
          } else {
            loaded = {
              healthcare: (raw.healthcare as ContactEntry[]) ?? [],
              legal: (raw.legal as ContactEntry[]) ?? [],
              relatives: (raw.relatives as ContactEntry[]) ?? [],
              friends: (raw.friends as ContactEntry[]) ?? [],
              spiritual: (raw.spiritual as ContactEntry[]) ?? [],
              financial: (raw.financial as ContactEntry[]) ?? [],
              other: (raw.other as ContactEntry[]) ?? [],
            }
          }
          const cleaned: FormState = Object.fromEntries(
            (Object.keys(loaded) as SectionKey[]).map(k => [k, loaded[k].filter(e => !isContactEntryEmpty(e))])
          ) as FormState
          formRef.current = cleaned
          setForm(cleaned)
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

  function scheduleAutosave() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performAutosave(), 1500)
  }

  function handleBlur() {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; performAutosave() }
  }

  function triggerSavedIndicator(id: string | null) {
    if (!id) return
    if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current)
    setSavedIndicatorId(id)
    setSavedIndicatorFading(false)
    savedFadeTimerRef.current = setTimeout(() => {
      setSavedIndicatorFading(true)
      setTimeout(() => setSavedIndicatorId(null), 400)
    }, 2600)
  }

  async function performAutosave() {
    const targetId = lastEditedEntryIdRef.current
    const currentForm = formRef.current
    const saveableForm: FormState = Object.fromEntries(
      (Object.keys(currentForm) as SectionKey[]).map(k => [k, currentForm[k].filter(e => !isContactEntryEmpty(e))])
    ) as FormState
    setSaveStatus('saving')
    setSavingEntryId(targetId)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setSaveStatus('error'); setSavingEntryId(null); return }
      if (!entryIdRef.current) {
        const { data: created, error } = await supabase.from('entries')
          .insert({ user_id: user.id, title: DOCUMENT_TITLE, section: 'capture', document_type: DOCUMENT_TYPE, content: saveableForm })
          .select('id').single()
        if (error) { setSaveStatus('error'); setSavingEntryId(null); return }
        if (created) { entryIdRef.current = created.id; setSavedEntryId(created.id) }
      } else {
        const { error } = await supabase.from('entries').update({ content: saveableForm }).eq('id', entryIdRef.current)
        if (error) { setSaveStatus('error'); setSavingEntryId(null); return }
      }
      if (entryIdRef.current) localStorage.setItem(`nightside.lastSaved.${user.id}.${entryIdRef.current}`, new Date().toISOString())
      setLastSavedAt(new Date()); setStatusNow(Date.now()); setSaveStatus('saved')
      setSavingEntryId(null); triggerSavedIndicator(targetId)
    } catch { setSaveStatus('error'); setSavingEntryId(null) }
  }

  async function handlePreviewExport() {
    const id = entryIdRef.current
    if (!id) return
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; await performAutosave() }
    router.push(`/app/entries/${id}`)
  }

  const saveStatusText = useMemo(() => {
    if (saveStatus === 'saving') return 'Saving…'
    if (saveStatus === 'error') return "Couldn't save"
    if (!lastSavedAt) return null
    const diff = Math.max(statusNow - lastSavedAt.getTime(), 0)
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24), w = Math.floor(d / 7)
    if (s < 60) return 'Saved just now'
    if (m < 60) return `Saved ${m}m ago`
    if (h < 24) return h === 1 ? 'Saved 1h ago' : `Saved ${h}h ago`
    if (d < 7) return d === 1 ? 'Saved 1 day ago' : `Saved ${d} days ago`
    return w === 1 ? 'Saved 1 week ago' : `Saved ${w} weeks ago`
  }, [lastSavedAt, statusNow, saveStatus])

  function toggleSection(idx: number) {
    const next = openSection === idx ? null : idx
    setOpenSection(next)
    if (next !== null) setTimeout(() => sectionRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function toggleEntry(setFn: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setFn(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function updateField(section: SectionKey, id: string, field: keyof ContactEntry, value: string) {
    const updated = {
      ...formRef.current,
      [section]: formRef.current[section].map(e => e.id === id ? { ...e, [field]: value } : e),
    }
    formRef.current = updated
    setForm(updated)
    lastEditedEntryIdRef.current = id
    scheduleAutosave()
  }

  function addEntry(section: SectionKey) {
    const entry: ContactEntry = { id: genId(), name: '', role: '', institution: '', phone: '', email: '', address: '' }
    const updated = { ...formRef.current, [section]: [...formRef.current[section], entry] }
    formRef.current = updated
    setForm(updated)
    openIdSetters[section](prev => new Set([...prev, entry.id]))
    setPendingFocusId(entry.id)
    scheduleAutosave()
  }

  function deleteEntry(section: SectionKey, id: string) {
    const updated = { ...formRef.current, [section]: formRef.current[section].filter(e => e.id !== id) }
    formRef.current = updated
    setForm(updated)
    openIdSetters[section](prev => { const n = new Set(prev); n.delete(id); return n })
    scheduleAutosave()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', fontFamily: hv, color: '#130426' }}>Loading…</div>
    </div>
  )

  function renderSection(
    idx: number,
    section: SectionKey,
    title: string,
    description: string,
    emptyLabel: string,
    addAnotherLabel: string,
    defaultTitle: string,
  ) {
    const entries = form[section]
    const openIds = openIdSets[section]
    return (
      <AccordionSection
        idx={idx} open={openSection === idx} onToggle={toggleSection}
        title={title} description={description}
        sectionRef={(el) => { sectionRefs.current[idx] = el }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id} id={entry.id}
              title={entry.name.trim() || defaultTitle}
              isOpen={openIds.has(entry.id)}
              onToggle={() => toggleEntry(openIdSetters[section], entry.id)}
              onDelete={() => deleteEntry(section, entry.id)}
              pendingFocusId={pendingFocusId}
              onFocused={() => setPendingFocusId(null)}
              isSaving={savingEntryId === entry.id}
              isSaved={savedIndicatorId === entry.id}
              savedFading={savedIndicatorFading}
            >
              <Field label="Name:" value={entry.name} onChange={(v) => updateField(section, entry.id, 'name', v)} onBlur={handleBlur} rows={1} />
              <Field label="Relationship / Role:" value={entry.role} onChange={(v) => updateField(section, entry.id, 'role', v)} onBlur={handleBlur} rows={1} />
              <Field label="Institution / Organization:" value={entry.institution ?? ''} onChange={(v) => updateField(section, entry.id, 'institution', v)} onBlur={handleBlur} rows={1} />
              <Field label="Phone:" value={entry.phone} onChange={(v) => updateField(section, entry.id, 'phone', v)} onBlur={handleBlur} rows={1} />
              <Field label="Email:" value={entry.email} onChange={(v) => updateField(section, entry.id, 'email', v)} onBlur={handleBlur} rows={1} />
              <Field label="Address:" value={entry.address} onChange={(v) => updateField(section, entry.id, 'address', v)} onBlur={handleBlur} rows={2} />
            </EntryCard>
          ))}
          <AddButton
            label={entries.length === 0 ? emptyLabel : addAnotherLabel}
            onClick={() => addEntry(section)}
          />
        </div>
      </AccordionSection>
    )
  }

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
            {saveStatus === 'saving' ? 'Preparing…' : 'Export'}
          </button>
          {saveStatusText && (
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.75)', fontFamily: hv }}>{saveStatusText}</span>
          )}
        </div>
      )}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 96px' }}>

        <div style={{ marginBottom: 24 }}>
          <Breadcrumbs theme="light" items={[{ label: 'Plan', href: '/app/plan' }, { label: 'Important Contacts' }]} />
        </div>

        <div style={{ marginBottom: 48 }}>
          <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]" style={{ color: '#130426', marginBottom: 20 }}>
            Important Contacts
          </h1>
          <p style={{ fontFamily: hv, fontSize: 15, fontWeight: 400, color: '#130426', lineHeight: 1.6, marginBottom: 24, maxWidth: 600 }}>
            When you can&apos;t communicate or have died, the people closest to you need to know who else to call. Your doctor, your lawyer, your executor, your employer, the friend who has your spare key. This document keeps that information in one place so no one is scrambling through your phone or wallet.
          </p>
          <AutosaveNotice>Contacts you add will save automatically to Your Plan.</AutosaveNotice>
          {saveStatusText && (
            <span className="mobile-saved-status" style={{ fontFamily: hv, fontSize: 13, color: 'rgba(19,4,38,0.65)', marginTop: 16, display: 'none' }}>{saveStatusText}</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderSection(0, 'healthcare', 'Doctors & Healthcare', 'Doctors, specialists, and other healthcare providers.', 'Add contact', 'Add another contact', 'Untitled contact')}
          {renderSection(1, 'legal', 'Legal & Decision Makers', 'Executors, attorneys, and people who may make decisions on your behalf.', 'Add contact', 'Add another contact', 'Untitled contact')}
          {renderSection(2, 'relatives', 'Relatives', 'Family members and next of kin.', 'Add contact', 'Add another contact', 'Untitled contact')}
          {renderSection(3, 'friends', 'Friends & Support Network', 'Friends or others who would support or be contacted.', 'Add contact', 'Add another contact', 'Untitled contact')}
          {renderSection(4, 'spiritual', 'Spiritual / Religious', 'Clergy, spiritual advisors, or community leaders.', 'Add contact', 'Add another contact', 'Untitled contact')}
          {renderSection(5, 'financial', 'Financial & Professional Services', 'Accountants, financial advisors, insurance providers, and other professional services.', 'Add contact', 'Add another contact', 'Untitled contact')}
          {renderSection(6, 'other', 'Other Important Contacts', 'Any other contacts you want included.', 'Add contact', 'Add another contact', 'Untitled contact')}
        </div>

      </div>
    </div>
  )
}

export default function Wrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F4EB]" />}>
      <ImportantContactsPage />
    </Suspense>
  )
}

// ---------------------------------------------------------------------------
// AccordionSection
// ---------------------------------------------------------------------------

function AccordionSection({ idx, open, onToggle, title, description, sectionRef, children }: {
  idx: number
  open: boolean
  onToggle: (idx: number) => void
  title: string
  description: string
  sectionRef: (el: HTMLDivElement | null) => void
  children: React.ReactNode
}) {
  return (
    <div
      ref={sectionRef}
      style={{ borderRadius: 16, border: open ? '2px solid #2C3777' : '1px solid #2C3777', overflow: 'hidden', background: '#FFFFFF' }}
    >
      <div style={{ display: 'flex' }}>
        {open && <div style={{ width: 6, background: '#BBABF4', flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          <button
            type="button"
            onClick={() => onToggle(idx)}
            style={{ width: '100%', background: 'transparent', border: 'none', padding: 24, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, textAlign: 'left' }}
          >
            <div>
              <p style={{ fontFamily: afG, fontSize: 24, fontWeight: 600, color: '#1A1A1A', margin: 0, lineHeight: 1.2 }}>
                {title}
              </p>
              <p style={{ fontFamily: hv, fontSize: 14, color: '#2C3777', margin: '6px 0 0', lineHeight: 1.4 }}>
                {description}
              </p>
            </div>
            <svg width="14" height="9" viewBox="0 0 14 9" fill="none" style={{ flexShrink: 0, transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: 4 }}>
              <path d="M1 1.5L7 7.5L13 1.5" stroke="#2C3777" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {open && (
            <div style={{ padding: '0 24px 28px' }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EntryCard
// ---------------------------------------------------------------------------

function EntryCard({ id, title, isOpen, onToggle, onDelete, pendingFocusId, onFocused, isSaving, isSaved, savedFading, children }: {
  id: string
  title: string
  isOpen: boolean
  onToggle: () => void
  onDelete: () => void
  pendingFocusId: string | null
  onFocused: () => void
  isSaving: boolean
  isSaved: boolean
  savedFading: boolean
  children: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pendingFocusId === id && isOpen) {
      setTimeout(() => {
        const ta = containerRef.current?.querySelector('textarea')
        if (ta) { ta.focus(); onFocused() }
      }, 50)
    }
  }, [pendingFocusId, isOpen, id, onFocused])

  return (
    <div
      ref={containerRef}
      style={{ background: '#F8F4EB', border: '1px solid #2C3777', borderRadius: 12, overflow: 'hidden' }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{ width: '100%', background: 'transparent', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }}
      >
        <span style={{ fontFamily: hv, fontSize: 16, color: '#1A1A1A', fontWeight: 600 }}>{title}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M1 1.5L6 6.5L11 1.5" stroke="#2C3777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #2C3777', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ height: 16 }} />
          {children}
          <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button
              type="button"
              onClick={onDelete}
              style={{ fontFamily: hv, fontSize: 13, color: '#2C3777', background: 'none', border: '1px solid #2C3777', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}
            >
              Delete
            </button>
            {isSaving && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saving…</span>
              </div>
            )}
            {isSaved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: savedFading ? 0 : 1, transition: 'opacity 0.4s ease' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="6" stroke="rgba(19,4,38,0.65)" strokeWidth="1.3" />
                  <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(19,4,38,0.65)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.65)' }}>Saved to Your Plan</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddButton
// ---------------------------------------------------------------------------

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 999, padding: '10px 18px', fontFamily: hv, fontSize: 14, color: '#2C3777', cursor: 'pointer', fontWeight: 500, alignSelf: 'flex-start' }}
    >
      + {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

function Field({ label, value, onChange, onBlur, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; rows?: number
}) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={rows}
        style={{ width: '100%', background: '#FFFFFF', color: '#1A1A1A', border: '1px solid #2C3777', borderRadius: 10, padding: 12, fontFamily: hv, fontSize: 15, lineHeight: 1.5, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}
