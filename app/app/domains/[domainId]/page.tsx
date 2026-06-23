'use client'

import { useEffect, useRef, useState, use } from 'react'
import Link from 'next/link'
import { ACTIVITY, DOCUMENT_TYPE_META, DOCUMENT_TYPE } from '@/lib/content-metadata'
import {
  addNoteToContainer,
  removeNoteFromContainer,
  createNote,
  updateNote,
  fetchNotesByDomainId,
  fetchContainers,
  fetchNotes,
  fetchAllUserEntries,
  fetchDomainHiddenNotes,
  hideDomainNote,
  unhideDomainNote,
  type Note,
  type Container,
  type EntryRef,
} from '@/lib/notes'
import {
  loadDomainState, saveCheckboxes, getCheckboxes,
  type DomainState,
} from '@/lib/domain-state'
import {
  getDomainStructureByCode,
  getDomainPromptIds,
  getDomainBottomLinks,
  type DomainStructure,
  type ReadinessItem as ReadinessItemDef,
} from '@/lib/domain-structure'
import { qualitativeLabel } from '@/lib/domain-status'
import SharedNoteCard from '@/app/components/notes/NoteCard'
import VoiceNoteCard from '@/app/components/notes/VoiceNoteCard'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'
import Breadcrumbs from '@/app/components/navigation/Breadcrumbs'
import AlertIcon from '@/app/components/AlertIcon'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entryLabel(entry: EntryRef): string {
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return DOCUMENT_TYPE_META.advance_directive_supplement.label
  if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) return DOCUMENT_TYPE_META.funeral_wishes.shortLabel ?? DOCUMENT_TYPE_META.funeral_wishes.label
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return DOCUMENT_TYPE_META.personal_admin_info.label
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return DOCUMENT_TYPE_META.important_contacts.label
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return DOCUMENT_TYPE_META.devices_and_accounts.label
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return DOCUMENT_TYPE_META.financial_information.label
  if (entry.activity === ACTIVITY.VALUES_RANKING) return 'Values Ranking'
  if (entry.activity === ACTIVITY.FEARS_RANKING) return 'Fears Ranking'
  return 'Untitled'
}

function getEntryHref(entry: EntryRef): string {
  if (entry.document_type === DOCUMENT_TYPE.ADVANCE_DIRECTIVE_SUPPLEMENT) return DOCUMENT_TYPE_META.advance_directive_supplement.href
  if (entry.document_type === DOCUMENT_TYPE.FUNERAL_WISHES) return DOCUMENT_TYPE_META.funeral_wishes.href
  if (entry.document_type === DOCUMENT_TYPE.PERSONAL_ADMIN_INFO) return DOCUMENT_TYPE_META.personal_admin_info.href
  if (entry.document_type === DOCUMENT_TYPE.IMPORTANT_CONTACTS) return DOCUMENT_TYPE_META.important_contacts.href
  if (entry.document_type === DOCUMENT_TYPE.DEVICES_AND_ACCOUNTS) return DOCUMENT_TYPE_META.devices_and_accounts.href
  if (entry.document_type === DOCUMENT_TYPE.FINANCIAL_INFORMATION) return DOCUMENT_TYPE_META.financial_information.href
  // Activity outputs open straight in the export preview (the snapshot is reserved
  // for sensitive-document export). They open in a new tab from the domain page; the
  // export preview's "Revisit exercise" back link returns to the activity.
  if (entry.activity === ACTIVITY.VALUES_RANKING) return `/app/entries/${entry.id}/export`
  if (entry.activity === ACTIVITY.FEARS_RANKING) return `/app/entries/${entry.id}/export`
  if (entry.activity === ACTIVITY.LEGACY_MAP) return `/app/entries/${entry.id}/export`
  return `/app/entries/${entry.id}`
}

const STICKY_COLORS = ['#f5f2e3', '#eae7f5', '#f3ede8']

// ---------------------------------------------------------------------------
// Page
//
// Post-Pass-2 redesign: the page is a practical-planning surface. A lavender
// main panel holds the Planning Status bar (one binary segment per readiness
// checkbox) and the readiness rows (checkboxes only — no status pills). A cream
// "Your thoughts" panel holds the per-domain note stream. Orientation rows are
// back-end-only (they drive tagging via lib/domain-structure) and are NOT
// rendered; "Reflection and Learning" is a flat link list at the bottom.
// ---------------------------------------------------------------------------

export default function DomainDetailPage({ params }: { params: Promise<{ domainId: string }> }) {
  const { domainId } = use(params)

  // Scroll to top on mount — prevents router cache from restoring a previous position.
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const [notes, setNotes] = useState<Note[]>([])          // container-linked notes for this domain
  const [allUserNotes, setAllUserNotes] = useState<Note[]>([])
  const [allUserEntries, setAllUserEntries] = useState<EntryRef[]>([])
  const [hiddenNoteIds, setHiddenNoteIds] = useState<Set<string>>(new Set())
  const [domain, setDomain] = useState<Container | null>(null)
  const [loading, setLoading] = useState(true)

  // Scratchpad / voice capture
  const [composerText, setComposerText] = useState('')
  const [saving, setSaving] = useState(false)
  const [showVoiceCapture, setShowVoiceCapture] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const composerTextRef = useRef('')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [addModalOpen, setAddModalOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const [loadedNotes, containers, allEnts, allNotes, hiddenIds] = await Promise.all([
        fetchNotesByDomainId(domainId),
        fetchContainers(),
        fetchAllUserEntries(),   // for ItemMaterials matching (by activity / document type)
        fetchNotes(),            // all user notes — for auto-surface + the Add modal
        fetchDomainHiddenNotes(domainId),
      ])
      setNotes(loadedNotes)
      setAllUserEntries(allEnts)
      setDomain(containers.find((c) => c.id === domainId) ?? null)
      setAllUserNotes(allNotes)
      setHiddenNoteIds(new Set(hiddenIds))
      setLoading(false)

      const foundDomain = containers.find((c) => c.id === domainId)
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'document_opened', metadata: { domain_id: domainId, domain_title: foundDomain?.title ?? null } }),
      }).catch(() => {})
    }
    load()
  }, [domainId])

  // Auto-resize scratchpad
  useEffect(() => {
    if (composerRef.current) {
      const el = composerRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [composerText])

  useEffect(() => () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }, [])

  // ── Capture: writes a freeform note linked to this domain (container_notes) ──
  async function doSave() {
    const trimmed = composerTextRef.current.trim()
    if (!trimmed || saving) return
    setSaving(true)
    const created = await createNote(trimmed)
    if (created) {
      await addNoteToContainer(created.id, domainId)
      setNotes((prev) => [created, ...prev])
      setAllUserNotes((prev) => [created, ...prev])
    }
    composerTextRef.current = ''
    setComposerText('')
    setSaving(false)
  }
  function handleScratchpadChange(val: string) {
    setComposerText(val)
    composerTextRef.current = val
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    if (val.trim()) autoSaveTimerRef.current = setTimeout(doSave, 2000)
  }
  async function handleScratchpadBlur() {
    if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null }
    await doSave()
  }
  async function handleVoiceNoteSaved(note: Note) {
    await addNoteToContainer(note.id, domainId)
    setNotes((prev) => [note, ...prev])
    setAllUserNotes((prev) => [note, ...prev])
    setShowVoiceCapture(false)
  }

  const domainStructure = getDomainStructureByCode(domain?.domain_code)
  const isWills = domain?.domain_code === 'wills_estates'
  const bottomLinks = getDomainBottomLinks(domain?.domain_code)

  // ── Per-domain note stream: (container-linked ∪ auto-surfaced prompt) − hidden ──
  const promptIds = getDomainPromptIds(domain?.domain_code)
  const containerNoteIds = new Set(notes.map((n) => n.id))
  const autoNotes = allUserNotes.filter(
    (n) => n.origin_type === 'prompt' && n.prompt_id != null && promptIds.includes(n.prompt_id)
  )
  const autoNoteIds = new Set(autoNotes.map((n) => n.id))
  const streamNotes: Note[] = (() => {
    const seen = new Set<string>()
    const out: Note[] = []
    for (const n of [...notes, ...autoNotes]) {
      if (seen.has(n.id) || hiddenNoteIds.has(n.id)) continue
      seen.add(n.id)
      out.push(n)
    }
    return out
  })()

  // Remove a sticky from this domain's stream (the note row itself is never deleted):
  // auto-surfaced notes are suppressed (hideDomainNote), container-linked notes are
  // un-linked (removeNoteFromContainer); a note that is both gets both. The DB write
  // happens immediately; the parent state update is deferred to onRemoved so NoteCard
  // can show its "Removed, still saved in Your Materials." confirmation first.
  async function handleRemoveWrite(noteId: string) {
    if (autoNoteIds.has(noteId)) await hideDomainNote(noteId, domainId)
    if (containerNoteIds.has(noteId)) await removeNoteFromContainer(noteId, domainId)
  }
  function handleRemoveCommit(noteId: string) {
    if (autoNoteIds.has(noteId)) setHiddenNoteIds((prev) => new Set(prev).add(noteId))
    if (containerNoteIds.has(noteId)) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    }
  }

  // Add modal: the user's notes not currently in this domain's stream.
  const streamIds = new Set(streamNotes.map((n) => n.id))
  const addCandidates = allUserNotes.filter((n) => !streamIds.has(n.id))
  async function handleAddFromModal(note: Note) {
    if (hiddenNoteIds.has(note.id) && autoNoteIds.has(note.id)) {
      // Previously-removed auto-surfaced note → un-hide so it re-surfaces.
      setHiddenNoteIds((prev) => { const next = new Set(prev); next.delete(note.id); return next })
      await unhideDomainNote(note.id, domainId)
    } else {
      // Attach a note from elsewhere to this domain.
      setNotes((prev) => prev.some((n) => n.id === note.id) ? prev : [note, ...prev])
      await addNoteToContainer(note.id, domainId)
    }
    setAddModalOpen(false)
  }

  // Hold a clean background while initial data resolves (avoids header/title flash).
  if (loading) {
    return <div className="min-h-screen" style={{ background: '#EDE7FF' }} />
  }

  return (
    <div className="min-h-screen" style={{ background: '#EDE7FF' }}>
      <style>{`
        .domain-layout { display: grid; grid-template-columns: 3fr 1fr; gap: 24px; align-items: start; }
        @media (max-width: 900px) { .domain-layout { grid-template-columns: 1fr; } }
        @keyframes noteAppear { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      {/* ── Header — dark gradient ── */}
      <div style={{ background: 'radial-gradient(circle at 20% 20%, #1a0535 0%, #130426 70%)' }}>
        <div className="max-w-6xl mx-auto" style={{ paddingTop: 16, paddingLeft: 40, paddingRight: 40, paddingBottom: 8 }}>
          <Breadcrumbs theme="navy" items={[{ label: 'Plan', href: '/app/plan' }, { label: domain?.title ?? '…' }]} />
        </div>
        <div className="max-w-6xl mx-auto" style={{ padding: '4px 40px 56px' }}>
          <h1 className="ns-title-activity text-white">{domain?.title ?? '…'}</h1>
        </div>
      </div>

      {/* ── Main content: lavender planning panel + cream Your Thoughts panel ── */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="domain-layout">

          {/* Lavender main panel — Planning Status + readiness rows */}
          <div className="rounded-xl" style={{ background: '#BBABF4', padding: 28 }}>
            {isWills && (
              <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontStyle: 'italic', color: 'rgba(19,4,38,0.72)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                The content in this area is for planning and reflection. For binding legal documents, including your will and any documents designating decision-makers, consult a lawyer in your province.
              </p>
            )}
            {domainStructure && (
              <PlanningStatusSection domainId={domainId} structure={domainStructure} entries={allUserEntries} />
            )}
          </div>

          {/* Cream Your Thoughts panel */}
          <div className="rounded-xl" style={{ background: '#F8F4EB', border: '1px solid rgba(242,152,54,0.35)', padding: 24, alignSelf: 'start' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Your thoughts</p>
            <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, color: 'rgba(0,0,0,0.65)' }}>Notes you&apos;ve captured for this area.</p>

            {streamNotes.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 items-start" style={{ marginTop: 20, marginBottom: 16 }}>
                {streamNotes.map((note, idx) => (
                  <div key={note.id} style={{ animation: 'noteAppear 320ms ease-out both' }}>
                    <NoteCard
                      note={note}
                      idx={idx}
                      onRemoveWrite={() => handleRemoveWrite(note.id)}
                      onRemoved={() => handleRemoveCommit(note.id)}
                      onUpdated={(newContent) => {
                        setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, content: newContent } : n))
                        setAllUserNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, content: newContent } : n))
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: 20, marginBottom: 16, fontSize: 14, color: 'rgba(0,0,0,0.5)', lineHeight: 1.5 }}>
                Nothing here yet. Capture a thought below, or add one from your notes.
              </p>
            )}

            {addCandidates.length > 0 && (
              <button
                onClick={() => setAddModalOpen(true)}
                style={{ fontSize: 14, fontWeight: 600, color: '#2C3777', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                + Add from your notes
              </button>
            )}

            {/* Capture */}
            <div style={{ position: 'relative', marginTop: 16 }}>
              <textarea
                ref={composerRef}
                value={composerText}
                onChange={(e) => handleScratchpadChange(e.target.value)}
                onBlur={handleScratchpadBlur}
                placeholder="Capture anything that comes up..."
                className="placeholder:text-[#130426]/65"
                style={{ display: 'block', width: '100%', background: '#FFFFFF', border: '1px solid #2C3777', borderRadius: 12, padding: '12px', fontSize: 16, lineHeight: 1.6, color: '#130426', resize: 'none', outline: 'none', minHeight: 96, boxSizing: 'border-box', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              {showVoiceCapture ? (
                <VoiceNoteButton saveMode={{ kind: 'freeform' }} autoStart theme="light" onSaved={handleVoiceNoteSaved} onDelete={() => setShowVoiceCapture(false)} />
              ) : (
                <button
                  onClick={() => setShowVoiceCapture(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', borderRadius: 10, cursor: 'pointer', background: 'rgba(44,55,119,0.06)', border: '1.5px solid rgba(44,55,119,0.2)', boxSizing: 'border-box' }}
                >
                  <svg width="18" height="18" viewBox="0 0 12 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                    <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill="#2d3a6b" />
                    <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke="#2d3a6b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    <line x1="6" y1="13" x2="6" y2="15.5" stroke="#2d3a6b" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke="#2d3a6b" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 700, color: '#2d3a6b' }}>Record a voice note</span>
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '3px 10px', background: 'rgba(44,55,119,0.12)', color: '#2d3a6b', border: '1px solid rgba(44,55,119,0.25)' }}>auto-transcribed</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Reflection and Learning — bottom links ── */}
        {bottomLinks.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#DB5835', margin: '0 0 4px 0' }}>Reflection and Learning</p>
            <p style={{ fontSize: 14, fontStyle: 'italic', color: 'rgba(19,4,38,0.70)', margin: '0 0 20px 0' }}>Topics to think through and read about for this area</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bottomLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-lg transition-opacity hover:opacity-75"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.10)', padding: '16px 20px', textDecoration: 'none' }}
                >
                  <span style={{ fontSize: 16, fontWeight: 500, color: '#130426' }}>{link.label}</span>
                  <span style={{ fontSize: 13, color: 'rgba(19,4,38,0.45)' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Add from your notes modal ── */}
      {addModalOpen && (
        <AddNotesModal
          domainTitle={domain?.title ?? 'this area'}
          candidates={addCandidates}
          onAdd={handleAddFromModal}
          onClose={() => setAddModalOpen(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PlanningStatusSection — the lavender panel: per-checkbox status bar + readiness rows
// ---------------------------------------------------------------------------

function PlanningStatusSection({
  domainId,
  structure,
  entries = [],
}: {
  domainId: string
  structure: DomainStructure
  entries?: EntryRef[]
}) {
  const [checkboxes, setCheckboxes] = useState<Record<string, boolean[]>>({})
  const [domainStateLoaded, setDomainStateLoaded] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const domainStateRef = useRef<DomainState>({})

  // Load readiness checkbox state from Supabase (source of truth). loadDomainState()
  // also performs the one-time legacy backfill. domainStateLoaded gates checkbox
  // toggles so an early tap isn't overwritten when state arrives.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { state } = await loadDomainState()
      if (cancelled) return
      domainStateRef.current = state
      const cbLoaded: Record<string, boolean[]> = {}
      for (const item of structure.readiness) {
        cbLoaded[item.key] = getCheckboxes(state, domainId, item.key, item.checkboxes.length)
      }
      setCheckboxes(cbLoaded)
      setDomainStateLoaded(true)
    })()
    return () => { cancelled = true }
  }, [structure, domainId])

  function handleCheckbox(itemKey: string, idx: number, total: number) {
    if (!domainStateLoaded) return
    setCheckboxes((prev) => {
      const current = prev[itemKey] ?? Array(total).fill(false)
      const updated = [...current]
      updated[idx] = !updated[idx]
      void saveCheckboxes(domainId, itemKey, updated, { currentState: domainStateRef.current })
        .then((next) => { if (next) { domainStateRef.current = next; setSaveError(false) } else setSaveError(true) })
        .catch(() => setSaveError(true))
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'document_field_saved', metadata: { domain_id: domainId, field_type: 'checkbox', field_key: itemKey } }),
      }).catch(() => {})
      return { ...prev, [itemKey]: updated }
    })
  }

  function itemEntries(item: ReadinessItemDef): EntryRef[] {
    if (!entries?.length) return []
    return entries.filter((e) =>
      (item.relatedActivities?.includes(e.activity ?? '') && !!e.activity) ||
      (item.relatedDocumentTypes?.includes(e.document_type ?? '') && !!e.document_type)
    )
  }

  // Planning status = one binary segment per readiness checkbox.
  const slots = structure.readiness.flatMap((r) => r.checkboxes.map((_, index) => ({ rowKey: r.key, index })))
  const total = slots.length
  const checked = slots.filter((s) => (checkboxes[s.rowKey]?.[s.index]) === true).length

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.15, color: '#130426', margin: '0 0 16px 0', textAlign: 'center' }}>
        Planning Status
      </h2>

      {/* Per-checkbox binary segment bar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 480, margin: '0 auto' }}>
        {slots.map((s, i) => {
          const isDone = (checkboxes[s.rowKey]?.[s.index]) === true
          return (
            <div
              key={i}
              style={{ flex: '1 1 18px', minWidth: 18, maxWidth: 40, height: 12, borderRadius: 6, background: isDone ? '#D85A30' : '#FAECE7', border: isDone ? 'none' : '1px solid #C9967E' }}
            />
          )
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 28 }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#130426', margin: '0 0 4px 0' }}>{qualitativeLabel(checked, total)}</p>
        <p style={{ fontSize: 13, color: 'rgba(19,4,38,0.70)', margin: 0 }}>{checked} of {total} complete</p>
        {saveError && (
          <p style={{ fontSize: 13, color: '#8B0000', margin: '12px 0 0 0' }}>
            <AlertIcon color="#8B0000" size={13} />Couldn&apos;t save your change. Please try again.
          </p>
        )}
      </div>

      {/* Readiness rows — checkboxes only, no status pills */}
      <div className="space-y-3">
        {structure.readiness.map((item) => (
          <ReadinessCard
            key={item.key}
            item={item}
            vals={checkboxes[item.key] ?? item.checkboxes.map(() => false)}
            matched={itemEntries(item)}
            onToggle={(idx) => handleCheckbox(item.key, idx, item.checkboxes.length)}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReadinessCard — title + checkboxes + ItemMaterials + static links (no pills/notes)
// ---------------------------------------------------------------------------

function ReadinessCard({
  item,
  vals,
  matched,
  onToggle,
}: {
  item: ReadinessItemDef
  vals: boolean[]
  matched: EntryRef[]
  onToggle: (idx: number) => void
}) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(19,4,38,0.08)' }}>
      <div className="p-4">
        <p className="text-[14px] font-semibold text-[#130426] leading-snug mb-2">{item.title}</p>
        {item.explanation && (
          <p className="text-[12px] leading-relaxed mb-4 text-[#130426]/60">{item.explanation}</p>
        )}
        <div className="space-y-1.5 mb-2">
          {item.checkboxes.map((label, idx) => (
            <div key={idx}>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={vals[idx] ?? false}
                  onChange={() => onToggle(idx)}
                  className="mt-0.5 shrink-0 accent-[#DB5835]"
                />
                <span className={`text-[12px] leading-snug transition-colors ${vals[idx] ? 'text-[#130426]/40 line-through' : 'text-[#130426]/80'}`}>
                  {label}
                </span>
              </label>
              {item.checkboxHelpers?.[idx] && (
                <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontStyle: 'italic', color: 'rgba(19,4,38,0.65)', margin: '3px 0 0 22px', lineHeight: 1.4 }}>
                  {item.checkboxHelpers[idx]}
                </p>
              )}
            </div>
          ))}
        </div>
        {matched.length > 0 && <ItemMaterials matched={matched} />}
        {item.staticLinks && item.staticLinks.length > 0 && (
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            {item.staticLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg transition-opacity hover:opacity-75"
                style={{ background: '#F8F4EB', border: '1px solid #F29836', padding: '12px 16px', textDecoration: 'none' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginRight: 8 }}>
                    <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke="#2C3777" strokeWidth="1.25" strokeLinejoin="round"/>
                    <path d="M10 1v3h3" stroke="#2C3777" strokeWidth="1.25" strokeLinejoin="round"/>
                    <path d="M5.5 7.5h5M5.5 10h5" stroke="#2C3777" strokeWidth="1.25" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 500, color: '#130426', lineHeight: 1.4 }}>{label}</span>
                </span>
                <span style={{ fontSize: 12, flexShrink: 0, marginLeft: 12, color: 'rgba(0,0,0,0.6)' }}>→</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ItemMaterials — the user's matching activity outputs / documents for a row
// ---------------------------------------------------------------------------

function ItemMaterials({ matched }: { matched: EntryRef[] }) {
  if (matched.length === 0) return null
  return (
    <div className="mt-4 space-y-2">
      {matched.map((entry) => (
        <a
          key={entry.id}
          href={getEntryHref(entry)}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-opacity hover:opacity-75"
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: 'rgba(242,152,54,0.10)', border: '1px solid rgba(242,152,54,0.24)' }}
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold leading-snug" style={{ color: '#130426' }}>
            {entry.activity ? <EntryOutputIcon /> : <EntryDocIcon />}
            {entryLabel(entry)}
          </span>
          <span className="text-[11px] shrink-0 ml-3" style={{ color: 'rgba(19,4,38,0.45)' }}>→</span>
        </a>
      ))}
    </div>
  )
}

function EntryDocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H10l3 3v9A1.5 1.5 0 0 1 11.5 14.5h-7A1.5 1.5 0 0 1 3 13V2.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M10 1v3h3" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
      <path d="M5.5 7.5h5M5.5 10h5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

function EntryOutputIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2.5" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      <circle cx="5.5" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor"/>
      <circle cx="11" cy="5.5" r="1.5" fill="currentColor"/>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// NoteCard — a sticky in the Your Thoughts stream. Actions: Edit + Remove only.
// The italic prompt (for prompt-response notes) is read-only.
// ---------------------------------------------------------------------------

function NoteCard({
  note, idx = 0, onRemoveWrite, onRemoved, onUpdated,
}: {
  note: Note
  idx?: number
  onRemoveWrite: () => void | Promise<void>   // DB write (hide / unlink); no parent state change
  onRemoved: () => void                        // parent drops the note from the stream
  onUpdated?: (newContent: string) => void
}) {
  const [removePhase, setRemovePhase] = useState<'idle' | 'show' | 'hide'>('idle')

  async function handleRemove() {
    await onRemoveWrite()
    setRemovePhase('show')
    setTimeout(() => setRemovePhase('hide'), 3000)
    setTimeout(() => onRemoved(), 3500)
  }
  async function handleSave(newContent: string) {
    await updateNote(note.id, newContent)
    onUpdated?.(newContent)
  }
  const stickyBg = STICKY_COLORS[idx % STICKY_COLORS.length]

  const removeBtn = (
    <button
      onClick={handleRemove}
      style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: '1.2' }}
      className="hover:opacity-75 transition-opacity"
    >
      Remove
    </button>
  )

  if (removePhase !== 'idle') {
    return (
      <div style={{ opacity: removePhase === 'hide' ? 0 : 1, maxHeight: removePhase === 'hide' ? '0px' : '500px', overflow: 'hidden', transition: 'opacity 0.4s ease, max-height 0.4s ease' }}>
        <div style={{ background: '#F8F4EB', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center' }}>
          <p style={{ fontSize: 14, color: '#1A1A1A', margin: 0, lineHeight: 1.5 }}>Removed, still saved in Your Materials.</p>
        </div>
      </div>
    )
  }

  if (note.note_mode === 'audio') {
    return (
      <VoiceNoteCard
        note={note}
        promptContext={note.origin_type === 'prompt' ? note.prompt_context ?? null : null}
        actions={removeBtn}
      />
    )
  }

  return (
    <SharedNoteCard
      content={note.content}
      promptContext={note.origin_type === 'prompt' ? note.prompt_context : null}
      onContentSave={handleSave}
      stickyStyle={{ backgroundColor: stickyBg, boxShadow: '3px 3px 8px rgba(19,4,38,0.20)', border: '1.5px solid rgba(120,90,60,0.22)', padding: '20px 12px 10px', borderRadius: '0' }}
      embellishment={
        <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%) rotate(-1deg)', width: '36px', height: '20px', backgroundColor: 'rgba(255,255,255,0.7)' }} />
      }
      actionsContent={(onEdit) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <button
            onClick={onEdit}
            style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: '1.2' }}
            className="hover:opacity-75 transition-opacity"
          >
            Edit
          </button>
          {removeBtn}
        </div>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// AddNotesModal — centered "Add to {domain}" picker of notes not in the stream
// ---------------------------------------------------------------------------

function AddNotesModal({
  domainTitle,
  candidates,
  onAdd,
  onClose,
}: {
  domainTitle: string
  candidates: Note[]
  onAdd: (note: Note) => void
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      {/* Backdrop (click to close) — a real button so it's keyboard/a11y-friendly */}
      <button
        aria-label="Close"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(19,4,38,0.45)', border: 'none', cursor: 'default', padding: 0 }}
      />
      <div
        style={{ position: 'relative', zIndex: 1, background: '#F8F4EB', borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 24px', borderBottom: '1px solid rgba(19,4,38,0.10)' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#130426', margin: 0 }}>Add to {domainTitle}</p>
          <button onClick={onClose} aria-label="Close" style={{ fontSize: 22, lineHeight: 1, color: 'rgba(19,4,38,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '12px 24px 24px' }}>
          {candidates.length === 0 ? (
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.55)', margin: '12px 0' }}>All of your notes are already in this area.</p>
          ) : (
            <div className="space-y-2" style={{ marginTop: 8 }}>
              {candidates.map((note) => (
                <div
                  key={note.id}
                  style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, background: '#FFFFFF', border: '1px solid rgba(19,4,38,0.10)', borderRadius: 10, padding: '12px 14px' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, color: '#130426', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                      {note.content || (note.note_mode === 'audio' ? '(voice note)' : '')}
                    </p>
                    {note.origin_type === 'prompt' && note.prompt_context && (
                      <p style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(19,4,38,0.6)', margin: '4px 0 0 0', lineHeight: 1.4 }}>{note.prompt_context}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onAdd(note)}
                    style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: '#2C3777', border: 'none', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}
                    className="hover:opacity-90 transition-opacity"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
