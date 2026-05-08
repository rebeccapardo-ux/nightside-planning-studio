'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'

const DOCUMENT_TYPE = 'financial_information'
const DOCUMENT_TITLE = 'Financial Information'
const afG = "'Apfel Grotezk', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccountEntry = {
  id: string
  name: string
  typeOfAccount: string
  accountNumber: string
  contactInfo: string
}

type DebtEntry = {
  id: string
  name: string
  type: string
  amount: string
  contactInfo: string
}

type FormState = {
  banking: AccountEntry[]
  investments: AccountEntry[]
  retirement: AccountEntry[]
  debts: DebtEntry[]
}

const EMPTY_FORM: FormState = {
  banking: [],
  investments: [],
  retirement: [],
  debts: [],
}

function isAccountEntryEmpty(e: AccountEntry) {
  return !e.name.trim() && !e.typeOfAccount.trim() && !e.contactInfo.trim()
}

function isDebtEntryEmpty(e: DebtEntry) {
  return !e.name.trim() && !e.type.trim() && !e.amount.trim() && !e.contactInfo.trim()
}

function toSaveable({ accountNumber: _acct, ...rest }: AccountEntry) {
  return rest
}

// ---------------------------------------------------------------------------
// Migration from old fixed-field format
// ---------------------------------------------------------------------------

function isOldFormat(content: Record<string, unknown>): boolean {
  return 'bank1Name' in content || 'retirement1Name' in content || 'loan1Name' in content
}

function migrateOldFormat(old: Record<string, string>): FormState {
  const banking: AccountEntry[] = []
  for (let n = 1; n <= 5; n++) {
    const name = old[`bank${n}Name`] ?? ''
    const typeOfAccount = old[`bank${n}TypeOfAccount`] ?? ''
    const accountNumber = old[`bank${n}AccountNumber`] ?? ''
    const contactInfo = old[`bank${n}ContactInfo`] ?? ''
    if (name || typeOfAccount || accountNumber || contactInfo) {
      banking.push({ id: genId(), name, typeOfAccount, accountNumber, contactInfo })
    }
  }
  const retirement: AccountEntry[] = []
  for (let n = 1; n <= 3; n++) {
    const name = old[`retirement${n}Name`] ?? ''
    const typeOfAccount = old[`retirement${n}TypeOfAccount`] ?? ''
    const accountNumber = old[`retirement${n}AccountNumber`] ?? ''
    const contactInfo = old[`retirement${n}ContactInfo`] ?? ''
    if (name || typeOfAccount || accountNumber || contactInfo) {
      retirement.push({ id: genId(), name, typeOfAccount, accountNumber, contactInfo })
    }
  }
  const debts: DebtEntry[] = []
  for (let n = 1; n <= 4; n++) {
    const name = old[`loan${n}Name`] ?? ''
    const amount = old[`loan${n}Amount`] ?? ''
    const contactInfo = old[`loan${n}ContactInfo`] ?? ''
    if (name || amount || contactInfo) {
      debts.push({ id: genId(), name, type: '', amount, contactInfo })
    }
  }
  return { banking, investments: [], retirement, debts }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FinancialInformationPage() {
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
  const [openBankingIds, setOpenBankingIds] = useState<Set<string>>(new Set())
  const [openInvestmentsIds, setOpenInvestmentsIds] = useState<Set<string>>(new Set())
  const [openRetirementIds, setOpenRetirementIds] = useState<Set<string>>(new Set())
  const [openDebtsIds, setOpenDebtsIds] = useState<Set<string>>(new Set())
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

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
          if (existing.created_at) setLastSavedAt(new Date(existing.created_at))
          const raw = existing.content as Record<string, unknown>
          let loaded: FormState
          if (isOldFormat(raw)) {
            loaded = migrateOldFormat(raw as Record<string, string>)
          } else {
            loaded = {
              banking: (raw.banking as AccountEntry[]) ?? [],
              investments: (raw.investments as AccountEntry[]) ?? [],
              retirement: (raw.retirement as AccountEntry[]) ?? [],
              debts: (raw.debts as DebtEntry[]) ?? [],
            }
          }
          const cleaned: FormState = {
            banking: loaded.banking.filter(e => !isAccountEntryEmpty(e)),
            investments: loaded.investments.filter(e => !isAccountEntryEmpty(e)),
            retirement: loaded.retirement.filter(e => !isAccountEntryEmpty(e)),
            debts: loaded.debts.filter(e => !isDebtEntryEmpty(e)),
          }
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

  async function performAutosave() {
    const currentForm = formRef.current
    const saveableForm = {
      banking: currentForm.banking.filter(e => !isAccountEntryEmpty(e)).map(toSaveable),
      investments: currentForm.investments.filter(e => !isAccountEntryEmpty(e)).map(toSaveable),
      retirement: currentForm.retirement.filter(e => !isAccountEntryEmpty(e)).map(toSaveable),
      debts: currentForm.debts.filter(e => !isDebtEntryEmpty(e)),
    }
    setSaveStatus('saving')
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setSaveStatus('error'); return }
      if (!entryIdRef.current) {
        const { data: created, error } = await supabase.from('entries')
          .insert({ user_id: user.id, title: DOCUMENT_TITLE, section: 'capture', document_type: DOCUMENT_TYPE, content: saveableForm })
          .select('id').single()
        if (error) { setSaveStatus('error'); return }
        if (created) { entryIdRef.current = created.id; setSavedEntryId(created.id) }
      } else {
        const { error } = await supabase.from('entries').update({ content: saveableForm }).eq('id', entryIdRef.current)
        if (error) { setSaveStatus('error'); return }
      }
      setLastSavedAt(new Date()); setStatusNow(Date.now()); setSaveStatus('saved')
    } catch { setSaveStatus('error') }
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
    if (s < 60) return 'Saved'
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

  // ── Account section helpers ──

  function updateAccountField(
    section: 'banking' | 'investments' | 'retirement',
    id: string,
    field: keyof AccountEntry,
    value: string
  ) {
    const updated = {
      ...formRef.current,
      [section]: formRef.current[section].map(e => e.id === id ? { ...e, [field]: value } : e),
    }
    formRef.current = updated
    setForm(updated)
    scheduleAutosave()
  }

  function addAccountEntry(
    section: 'banking' | 'investments' | 'retirement',
    setFn: React.Dispatch<React.SetStateAction<Set<string>>>
  ) {
    const entry: AccountEntry = { id: genId(), name: '', typeOfAccount: '', accountNumber: '', contactInfo: '' }
    const updated = { ...formRef.current, [section]: [...formRef.current[section], entry] }
    formRef.current = updated
    setForm(updated)
    setFn(prev => new Set([...prev, entry.id]))
    setPendingFocusId(entry.id)
    scheduleAutosave()
  }

  function deleteAccountEntry(section: 'banking' | 'investments' | 'retirement', id: string, setFn: React.Dispatch<React.SetStateAction<Set<string>>>) {
    const updated = { ...formRef.current, [section]: formRef.current[section].filter(e => e.id !== id) }
    formRef.current = updated
    setForm(updated)
    setFn(prev => { const n = new Set(prev); n.delete(id); return n })
    scheduleAutosave()
  }

  // ── Debt helpers ──

  function updateDebtField(id: string, field: keyof DebtEntry, value: string) {
    const updated = {
      ...formRef.current,
      debts: formRef.current.debts.map(e => e.id === id ? { ...e, [field]: value } : e),
    }
    formRef.current = updated
    setForm(updated)
    scheduleAutosave()
  }

  function addDebtEntry() {
    const entry: DebtEntry = { id: genId(), name: '', type: '', amount: '', contactInfo: '' }
    const updated = { ...formRef.current, debts: [...formRef.current.debts, entry] }
    formRef.current = updated
    setForm(updated)
    setOpenDebtsIds(prev => new Set([...prev, entry.id]))
    setPendingFocusId(entry.id)
    scheduleAutosave()
  }

  function deleteDebtEntry(id: string) {
    const updated = { ...formRef.current, debts: formRef.current.debts.filter(e => e.id !== id) }
    formRef.current = updated
    setForm(updated)
    setOpenDebtsIds(prev => { const n = new Set(prev); n.delete(id); return n })
    scheduleAutosave()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', fontFamily: hv, color: '#130426' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F4EB' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 96px' }}>

        <div style={{ marginBottom: 24 }}>
          <Breadcrumbs theme="light" items={[{ label: 'Plan', href: '/app/materials' }, { label: 'Financial Information' }]} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 48 }}>
          <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]" style={{ color: '#130426', marginBottom: 0 }}>
            Financial Information
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
                {saveStatus === 'saving' ? 'Preparing…' : 'Finalize & Export →'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Banking & Credit ── */}
          <AccordionSection
            idx={0} open={openSection === 0} onToggle={toggleSection}
            title="Banking & Credit"
            description="Everyday accounts, credit cards, and lines of credit."
            sectionRef={(el) => { sectionRefs.current[0] = el }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.banking.map((entry) => (
                <EntryCard
                  key={entry.id} id={entry.id}
                  title={entry.name.trim() || 'Untitled account'}
                  isOpen={openBankingIds.has(entry.id)}
                  onToggle={() => toggleEntry(setOpenBankingIds, entry.id)}
                  onDelete={() => deleteAccountEntry('banking', entry.id, setOpenBankingIds)}
                  pendingFocusId={pendingFocusId}
                  onFocused={() => setPendingFocusId(null)}
                >
                  <Field label="Institution Name:" value={entry.name} onChange={(v) => updateAccountField('banking', entry.id, 'name', v)} onBlur={handleBlur} rows={1} />
                  <Field label="Type of account:" value={entry.typeOfAccount} onChange={(v) => updateAccountField('banking', entry.id, 'typeOfAccount', v)} onBlur={handleBlur} rows={1} />
                  <AccountNumberDisplay />
                  <Field label="Contact info:" value={entry.contactInfo} onChange={(v) => updateAccountField('banking', entry.id, 'contactInfo', v)} onBlur={handleBlur} rows={2} />
                </EntryCard>
              ))}
              <AddButton
                label={form.banking.length === 0 ? 'Add account' : 'Add another account'}
                onClick={() => addAccountEntry('banking', setOpenBankingIds)}
              />
            </div>
          </AccordionSection>

          {/* ── Investments ── */}
          <AccordionSection
            idx={1} open={openSection === 1} onToggle={toggleSection}
            title="Investments"
            description="Brokerage accounts, managed portfolios, and other investments."
            sectionRef={(el) => { sectionRefs.current[1] = el }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.investments.map((entry) => (
                <EntryCard
                  key={entry.id} id={entry.id}
                  title={entry.name.trim() || 'Untitled investment'}
                  isOpen={openInvestmentsIds.has(entry.id)}
                  onToggle={() => toggleEntry(setOpenInvestmentsIds, entry.id)}
                  onDelete={() => deleteAccountEntry('investments', entry.id, setOpenInvestmentsIds)}
                  pendingFocusId={pendingFocusId}
                  onFocused={() => setPendingFocusId(null)}
                >
                  <Field label="Institution Name:" value={entry.name} onChange={(v) => updateAccountField('investments', entry.id, 'name', v)} onBlur={handleBlur} rows={1} />
                  <Field label="Type of account:" value={entry.typeOfAccount} onChange={(v) => updateAccountField('investments', entry.id, 'typeOfAccount', v)} onBlur={handleBlur} rows={1} />
                  <AccountNumberDisplay />
                  <Field label="Contact info:" value={entry.contactInfo} onChange={(v) => updateAccountField('investments', entry.id, 'contactInfo', v)} onBlur={handleBlur} rows={2} />
                </EntryCard>
              ))}
              <AddButton
                label={form.investments.length === 0 ? 'Add investment' : 'Add another investment'}
                onClick={() => addAccountEntry('investments', setOpenInvestmentsIds)}
              />
            </div>
          </AccordionSection>

          {/* ── Retirement & Income ── */}
          <AccordionSection
            idx={2} open={openSection === 2} onToggle={toggleSection}
            title="Retirement & Income"
            description="Pensions, retirement accounts, annuities, and income sources."
            sectionRef={(el) => { sectionRefs.current[2] = el }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.retirement.map((entry) => (
                <EntryCard
                  key={entry.id} id={entry.id}
                  title={entry.name.trim() || 'Untitled item'}
                  isOpen={openRetirementIds.has(entry.id)}
                  onToggle={() => toggleEntry(setOpenRetirementIds, entry.id)}
                  onDelete={() => deleteAccountEntry('retirement', entry.id, setOpenRetirementIds)}
                  pendingFocusId={pendingFocusId}
                  onFocused={() => setPendingFocusId(null)}
                >
                  <Field label="Institution Name:" value={entry.name} onChange={(v) => updateAccountField('retirement', entry.id, 'name', v)} onBlur={handleBlur} rows={1} />
                  <Field label="Type of account:" value={entry.typeOfAccount} onChange={(v) => updateAccountField('retirement', entry.id, 'typeOfAccount', v)} onBlur={handleBlur} rows={1} />
                  <AccountNumberDisplay />
                  <Field label="Contact info:" value={entry.contactInfo} onChange={(v) => updateAccountField('retirement', entry.id, 'contactInfo', v)} onBlur={handleBlur} rows={2} />
                </EntryCard>
              ))}
              <AddButton
                label={form.retirement.length === 0 ? 'Add income or retirement item' : 'Add another item'}
                onClick={() => addAccountEntry('retirement', setOpenRetirementIds)}
              />
            </div>
          </AccordionSection>

          {/* ── Debts & Loans ── */}
          <AccordionSection
            idx={3} open={openSection === 3} onToggle={toggleSection}
            title="Debts & Loans"
            description="Mortgages, loans, lines of credit, and other debts."
            sectionRef={(el) => { sectionRefs.current[3] = el }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.debts.map((entry) => (
                <EntryCard
                  key={entry.id} id={entry.id}
                  title={entry.name.trim() || 'Untitled debt or loan'}
                  isOpen={openDebtsIds.has(entry.id)}
                  onToggle={() => toggleEntry(setOpenDebtsIds, entry.id)}
                  onDelete={() => deleteDebtEntry(entry.id)}
                  pendingFocusId={pendingFocusId}
                  onFocused={() => setPendingFocusId(null)}
                >
                  <Field label="Institution Name:" value={entry.name} onChange={(v) => updateDebtField(entry.id, 'name', v)} onBlur={handleBlur} rows={1} />
                  <Field label="Type:" value={entry.type} onChange={(v) => updateDebtField(entry.id, 'type', v)} onBlur={handleBlur} rows={1} />
                  <Field label="Amount:" value={entry.amount} onChange={(v) => updateDebtField(entry.id, 'amount', v)} onBlur={handleBlur} rows={1} />
                  <AccountNumberDisplay />
                  <Field label="Contact info:" value={entry.contactInfo} onChange={(v) => updateDebtField(entry.id, 'contactInfo', v)} onBlur={handleBlur} rows={2} />
                </EntryCard>
              ))}
              <AddButton
                label={form.debts.length === 0 ? 'Add debt or loan' : 'Add another debt or loan'}
                onClick={addDebtEntry}
              />
            </div>
          </AccordionSection>

        </div>
      </div>
    </div>
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

function EntryCard({ id, title, isOpen, onToggle, onDelete, pendingFocusId, onFocused, children }: {
  id: string
  title: string
  isOpen: boolean
  onToggle: () => void
  onDelete: () => void
  pendingFocusId: string | null
  onFocused: () => void
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
          <div style={{ paddingTop: 4 }}>
            <button
              type="button"
              onClick={onDelete}
              style={{ fontFamily: hv, fontSize: 13, color: '#2C3777', background: 'none', border: '1px solid #2C3777', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}
            >
              Delete
            </button>
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
// AccountNumberDisplay
// ---------------------------------------------------------------------------

function AccountNumberDisplay() {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>Account number</label>
      <div style={{
        width: '100%',
        background: '#F5F5F5',
        color: 'rgba(26,26,26,0.45)',
        border: '1px solid #2C3777',
        borderRadius: 10,
        padding: 12,
        fontFamily: hv,
        fontSize: 15,
        lineHeight: 1.5,
        boxSizing: 'border-box' as const,
      }}>
        To be added when finalizing document
      </div>
      <p style={{ fontFamily: hv, fontSize: 13, color: 'rgba(26,26,26,0.5)', marginTop: 8, lineHeight: 1.5 }}>
        This will be included in your export, but won&apos;t be saved to your plan.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

function Field({ label, value, onChange, onBlur, rows = 2, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; rows?: number; placeholder?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: hv, fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={rows}
        placeholder={placeholder}
        style={{ width: '100%', background: '#FFFFFF', color: '#1A1A1A', border: '1px solid #2C3777', borderRadius: 10, padding: 12, fontFamily: hv, fontSize: 15, lineHeight: 1.5, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}
