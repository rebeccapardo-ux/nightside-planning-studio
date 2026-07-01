'use client'

import { useEffect, useRef, useState } from 'react'
import { ACTIVITY, DOCUMENT_TYPE_META, DOCUMENT_TYPE, type DocumentType } from '@/lib/content-metadata'
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
  type DomainStructure,
  type ReadinessItem as ReadinessItemDef,
} from '@/lib/domain-structure'
import { qualitativeLabel, computeDomainProgress } from '@/lib/domain-status'
import {
  fetchUserTasks,
  toggleUserTask,
  createUserTask,
  updateUserTaskLabel,
  deleteUserTask,
  convertNoteToTask,
  bucketTasksByRow,
  OTHER_ROW_KEY,
  type UserTask,
} from '@/lib/user-tasks'
import MakeTaskModal, { type TaskDestination } from './MakeTaskModal'
import SharedNoteCard from '@/app/components/notes/NoteCard'
import VoiceNoteCard from '@/app/components/notes/VoiceNoteCard'
import VoiceNoteButton from '@/app/components/VoiceNoteButton'
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
// Per-note-type "Don't show again" for the conversion warning (separate keys so a
// user can keep the higher-stakes voice warning while hiding text). Device-level;
// cleared on sign-out, which re-warns a fresh session.
const TEXT_WARNING_KEY = 'nightside.textConversionWarningDismissed'
const VOICE_WARNING_KEY = 'nightside.voiceConversionWarningDismissed'
function readWarningDismissed(key: string): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem(key) === '1' } catch { return false }
}

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

// The per-area Plan workspace (Planning Status panel + Your-thoughts notes stream),
// embedded in the /app/area/[slug] pages. The area page supplies the header/intro/
// Activities and the section container; this component renders the workspace only.
// domainId is the user's container UUID (the area page resolves slug → domain_code →
// container and passes it). Surfacing/tasks/notes logic is unchanged.
export default function AreaPlanSection({ domainId }: { domainId: string }) {
  // NOTE: do NOT scroll-to-top on mount here. This component mounts when the collapsible
  // "Plan" section is expanded (not just on page load), so a mount-time window.scrollTo(0,0)
  // yanks the user to the top of the page every time they open Plan. Page-load scroll
  // position is Next.js's job (server-component navigation already resets it).

  const [notes, setNotes] = useState<Note[]>([])          // container-linked notes for this domain
  const [allUserNotes, setAllUserNotes] = useState<Note[]>([])
  const [allUserEntries, setAllUserEntries] = useState<EntryRef[]>([])
  const [hiddenNoteIds, setHiddenNoteIds] = useState<Set<string>>(new Set())
  const [domain, setDomain] = useState<Container | null>(null)
  const [loading, setLoading] = useState(true)

  // "Make this a task": the note being converted (modal open when non-null), a
  // refresh key the conversion bumps so PlanningStatusSection refetches this
  // domain's tasks, and a transient error flag.
  const [makeTaskNote, setMakeTaskNote] = useState<Note | null>(null)
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0)
  const [conversionError, setConversionError] = useState(false)
  // "Don't show again" for the conversion warning, per note type. Read at init
  // (these flags aren't rendered until the modal opens, so no hydration concern).
  const [textWarningDismissed, setTextWarningDismissed] = useState(() => readWarningDismissed(TEXT_WARNING_KEY))
  const [voiceWarningDismissed, setVoiceWarningDismissed] = useState(() => readWarningDismissed(VOICE_WARNING_KEY))
  function dismissTextWarning() {
    setTextWarningDismissed(true)
    try { window.localStorage.setItem(TEXT_WARNING_KEY, '1') } catch { /* ignore */ }
  }
  function dismissVoiceWarning() {
    setVoiceWarningDismissed(true)
    try { window.localStorage.setItem(VOICE_WARNING_KEY, '1') } catch { /* ignore */ }
  }

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
    }
    load()
  }, [domainId])

  // The global Notepad modal lives outside this component, so when a note composed there
  // is linked to THIS area's container it can't update our local state directly. It fires
  // a window event after linking; re-fetch this domain's notes so the note appears in Your
  // Thoughts immediately (same instant-render as the in-place composer), no refresh needed.
  useEffect(() => {
    function onContainerNoteAdded(e: Event) {
      const detail = (e as CustomEvent<{ containerId?: string }>).detail
      if (detail?.containerId !== domainId) return
      Promise.all([fetchNotesByDomainId(domainId), fetchNotes()])
        .then(([linked, all]) => { setNotes(linked); setAllUserNotes(all) })
        .catch(() => {})
    }
    window.addEventListener('nightside:container-note-added', onContainerNoteAdded)
    return () => window.removeEventListener('nightside:container-note-added', onContainerNoteAdded)
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
  // can show its "Removed, still saved in Your materials." confirmation first.
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

  // "Make this a task": convert the open note into a task at the chosen
  // destination (any domain). The note is deleted DB-side by the RPC; here we
  // drop it from local stream state and, if it landed in THIS domain, bump
  // tasksRefreshKey so PlanningStatusSection refetches and shows it.
  async function handleMakeTaskConfirm(dest: TaskDestination) {
    const note = makeTaskNote
    if (!note) return
    setMakeTaskNote(null)
    const { ok } = await convertNoteToTask({ noteId: note.id, domainId: dest.domainId, rowKey: dest.rowKey, label: dest.label })
    if (!ok) {
      setConversionError(true)
      setTimeout(() => setConversionError(false), 4000)
      return  // leave the note in the stream so the user can retry
    }
    // Converted (or already gone): remove the note from every local list.
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    setAllUserNotes((prev) => prev.filter((n) => n.id !== note.id))
    setHiddenNoteIds((prev) => { if (!prev.has(note.id)) return prev; const next = new Set(prev); next.delete(note.id); return next })
    if (dest.domainId === domainId) setTasksRefreshKey((k) => k + 1)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'note_converted_to_task', metadata: { origin_type: note.origin_type ?? null, destination_domain_id: dest.domainId, destination_domain_code: domain?.domain_code ?? null, destination_row_key: dest.rowKey } }),
    }).catch(() => {})
  }

  // Hold a clean background while initial data resolves (avoids header/title flash).
  if (loading) {
    return <div className="min-h-screen" style={{ background: '#EDE7FF' }} />
  }

  return (
    <div>
      <style>{`
        .domain-layout { display: grid; grid-template-columns: 3fr 1fr; gap: 24px; align-items: start; }
        @media (max-width: 900px) { .domain-layout { grid-template-columns: 1fr; } }
        @keyframes noteAppear { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      {/* ── Main content: lavender planning panel + cream Your Thoughts panel.
          Rendered bare — the area page supplies the header/intro and the section container. ── */}
      <div>
        <div className="domain-layout">

          {/* Left column — the lavender Planning Status panel (relevant documents are
              surfaced inline within it, per readiness row, not as a top callout). */}
          <div>
          {/* Softer lavender than the #BBABF4 brand fill so the panel reads gently against
              cream (the Your-thoughts panel beside it + the cream Overview band above on
              activity-less areas like Personal Admin), while staying clearly distinct from the
              #ECE7F7 Plan-section background. */}
          <div className="rounded-xl" style={{ background: '#D0C5F2', padding: 28 }}>
            {isWills && (
              <p style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontStyle: 'italic', color: 'rgba(19,4,38,0.72)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                The content in this area is for planning and reflection. For binding legal documents, including your will and any documents designating substitute decision-makers, consult a lawyer in your province.
              </p>
            )}
            {domainStructure && (
              <PlanningStatusSection domainId={domainId} domainCode={domain?.domain_code} structure={domainStructure} entries={allUserEntries} tasksRefreshKey={tasksRefreshKey} />
            )}
          </div>
          </div>

          {/* Cream Your Thoughts panel */}
          <div className="rounded-xl" style={{ background: '#F8F4EB', border: '1px solid rgba(242,152,54,0.35)', padding: 24, alignSelf: 'start' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Your thoughts</p>
            <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, color: 'rgba(0,0,0,0.65)' }}>Notes you&apos;ve captured for this area.</p>
            {conversionError && (
              <p style={{ marginTop: 8, fontSize: 13, color: '#8B0000' }}>
                <AlertIcon color="#8B0000" size={13} />Couldn&apos;t make that into a task. Please try again.
              </p>
            )}

            {streamNotes.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 items-start" style={{ marginTop: 20, marginBottom: 16 }}>
                {streamNotes.map((note, idx) => (
                  <div key={note.id} style={{ animation: 'noteAppear 320ms ease-out both' }}>
                    <NoteCard
                      note={note}
                      idx={idx}
                      onRemoveWrite={() => handleRemoveWrite(note.id)}
                      onRemoved={() => handleRemoveCommit(note.id)}
                      onMakeTask={() => setMakeTaskNote(note)}
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
                Nothing here yet. Capture a thought below, or add one from Your materials.
              </p>
            )}

            {addCandidates.length > 0 && (
              <button
                onClick={() => setAddModalOpen(true)}
                style={{ fontSize: 14, fontWeight: 600, color: '#2C3777', background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 44, display: 'inline-flex', alignItems: 'center', textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                + Add from Your materials
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

      {/* ── Convert to a task: destination picker (scoped to current domain) ── */}
      {makeTaskNote && domain && (
        <MakeTaskModal
          note={makeTaskNote}
          domain={domain}
          textWarningDismissed={textWarningDismissed}
          voiceWarningDismissed={voiceWarningDismissed}
          onDismissTextWarning={dismissTextWarning}
          onDismissVoiceWarning={dismissVoiceWarning}
          onConfirm={handleMakeTaskConfirm}
          onClose={() => setMakeTaskNote(null)}
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
  domainCode,
  structure,
  entries = [],
  tasksRefreshKey = 0,
}: {
  domainId: string
  domainCode: string | null | undefined
  structure: DomainStructure
  entries?: EntryRef[]
  tasksRefreshKey?: number
}) {
  const [checkboxes, setCheckboxes] = useState<Record<string, boolean[]>>({})
  const [domainStateLoaded, setDomainStateLoaded] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const domainStateRef = useRef<DomainState>({})

  // User-defined tasks for this domain (user_checkboxes). Owned here alongside the
  // platform checkbox state so the bar and the readiness rows share one source.
  const [userTasks, setUserTasks] = useState<UserTask[]>([])

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

  // Load this domain's user-defined tasks (DB-only; no localStorage backfill).
  // Re-runs when tasksRefreshKey changes — e.g. after a note is converted into a
  // task in this domain (the new task lives in user_checkboxes, fetched here).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const tasks = await fetchUserTasks(domainId)
      if (cancelled) return
      setUserTasks(tasks)
    })()
    return () => { cancelled = true }
  }, [domainId, tasksRefreshKey])

  // Toggle a user task — optimistic, with rollback on save failure. Mirrors
  // handleCheckbox (immediate UI update; analytics document_field_saved).
  function handleUserTaskToggle(task: UserTask) {
    const next = !task.checked
    setUserTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, checked: next } : t)))
    void toggleUserTask(task.id, next)
      .then((ok) => {
        if (ok) { setSaveError(false); return }
        setUserTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, checked: task.checked } : t)))
        setSaveError(true)
      })
      .catch(() => {
        setUserTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, checked: task.checked } : t)))
        setSaveError(true)
      })
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'document_field_saved', metadata: { domain_id: domainId, domain_code: domainCode ?? null, field_type: 'user_task', field_key: `user_task:${task.row_key}` } }),
    }).catch(() => {})
  }

  // Add a task — await-then-append (D6): the row only appears once the DB insert
  // returns. Returns true so the inline input can clear on success.
  async function handleAddTask(rowKey: string, label: string): Promise<boolean> {
    const created = await createUserTask(domainId, rowKey, label)
    if (!created) { setSaveError(true); return false }
    setUserTasks((prev) => [...prev, created])
    setSaveError(false)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'user_task_added', metadata: { domain_id: domainId, domain_code: domainCode ?? null, field_key: `user_task:${rowKey}` } }),
    }).catch(() => {})
    return true
  }

  // Rename a task — optimistic, with rollback on save failure.
  function handleSaveTaskLabel(task: UserTask, label: string) {
    const prevLabel = task.label
    setUserTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, label } : t)))
    void updateUserTaskLabel(task.id, label)
      .then((ok) => {
        if (ok) { setSaveError(false); return }
        setUserTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, label: prevLabel } : t)))
        setSaveError(true)
      })
      .catch(() => {
        setUserTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, label: prevLabel } : t)))
        setSaveError(true)
      })
  }

  // Delete a task — optimistic remove; on failure re-insert in creation order.
  function handleDeleteTask(task: UserTask) {
    setUserTasks((prev) => prev.filter((t) => t.id !== task.id))
    void deleteUserTask(task.id)
      .then((ok) => {
        if (ok) { setSaveError(false); return }
        setUserTasks((prev) => [...prev, task].sort((a, b) => a.created_at.localeCompare(b.created_at)))
        setSaveError(true)
      })
      .catch(() => {
        setUserTasks((prev) => [...prev, task].sort((a, b) => a.created_at.localeCompare(b.created_at)))
        setSaveError(true)
      })
  }

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
        body: JSON.stringify({ eventName: 'document_field_saved', metadata: { domain_id: domainId, domain_code: domainCode ?? null, field_type: 'checkbox', field_key: itemKey } }),
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

  // Document types the user has started (an entry of that type exists) — drives the
  // inline "Not started / In progress" status on relevant-document links. Derived from
  // ALL the user's entries, not just this row's matches, so a staticLink document with
  // no relatedDocumentTypes mapping still reports the right status.
  const startedDocTypes = new Set<string>((entries ?? []).filter((e) => e.document_type).map((e) => e.document_type as string))

  // Planning status routes through the shared computeDomainProgress helper.
  // Wrap local `checkboxes` as a DomainState so the helper sees this domain's
  // live state — domainStateRef lags toggles by the debounce interval, and the
  // bar must move the instant a box is ticked. User tasks count too.
  const { checked, total, pct } = computeDomainProgress(
    domainId, domainCode, { [domainId]: { checkboxes } }, userTasks,
  )

  // Bucket user tasks by readiness row; `other` = catch-all + stale-key fall-through.
  const { byRow, other } = bucketTasksByRow(userTasks, structure.readiness.map((r) => r.key))

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.15, color: '#130426', margin: '0 0 16px 0', textAlign: 'center' }}>
        Planning Status
      </h2>

      {/* Proportional planning-status bar (fraction = checked / total) */}
      <div style={{ maxWidth: 480, height: 12, margin: '0 auto', borderRadius: 6, background: '#FAECE7', border: '1px solid #C9967E', overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: '#D85A30', transition: 'width 200ms ease' }} />
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

      {/* Readiness rows — platform checkboxes + user tasks, no status pills */}
      <div className="space-y-3">
        {structure.readiness.map((item) => (
          <ReadinessCard
            key={item.key}
            item={item}
            vals={checkboxes[item.key] ?? item.checkboxes.map(() => false)}
            matched={itemEntries(item)}
            startedDocTypes={startedDocTypes}
            onToggle={(idx) => handleCheckbox(item.key, idx, item.checkboxes.length)}
            userTasks={byRow[item.key] ?? []}
            onToggleTask={handleUserTaskToggle}
            onAddTask={handleAddTask}
            onSaveTaskLabel={handleSaveTaskLabel}
            onDeleteTask={handleDeleteTask}
          />
        ))}
        {/* Catch-all row — ALWAYS rendered, so "+ Add task" here is the path to
            create an unhomed task (and where converted 'other'/stale-key tasks land).
            Empty shows null-state copy; populated behaves like any readiness row. */}
        <ReadinessCard
          item={{
            key: OTHER_ROW_KEY,
            title: 'Other tasks',
            explanation: other.length === 0 ? "Optional space for tasks that don't fit the topics above." : '',
            checkboxes: [],
          }}
          vals={[]}
          matched={[]}
          userTasks={other}
          onToggleTask={handleUserTaskToggle}
          onAddTask={handleAddTask}
          onSaveTaskLabel={handleSaveTaskLabel}
          onDeleteTask={handleDeleteTask}
        />
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
  startedDocTypes = new Set<string>(),
  onToggle,
  userTasks = [],
  onToggleTask,
  onAddTask,
  onSaveTaskLabel,
  onDeleteTask,
}: {
  item: ReadinessItemDef
  vals: boolean[]
  matched: EntryRef[]
  startedDocTypes?: Set<string>
  onToggle?: (idx: number) => void
  userTasks?: UserTask[]
  onToggleTask?: (task: UserTask) => void
  onAddTask?: (rowKey: string, label: string) => Promise<boolean>
  onSaveTaskLabel?: (task: UserTask, label: string) => void
  onDeleteTask?: (task: UserTask) => void
}) {
  // Inline interaction state, local to this row.
  const [addOpen, setAddOpen] = useState(false)
  const [addText, setAddText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  // Escape during edit must cancel without the input's blur re-committing it.
  const editCancelRef = useRef(false)

  // Ref-based focus (jsx-a11y forbids the autoFocus prop). Keyed on the open/edit
  // state, not on text, so typing doesn't refocus. The confirm button must be
  // focused so its onBlur ("click elsewhere") cancels the delete.
  const addInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (addOpen) addInputRef.current?.focus() }, [addOpen])
  useEffect(() => { if (editingId) editInputRef.current?.focus() }, [editingId])
  useEffect(() => { if (confirmId) confirmBtnRef.current?.focus() }, [confirmId])

  async function submitAdd() {
    const text = addText.trim()
    if (!text || !onAddTask) { setAddOpen(false); setAddText(''); return }
    const ok = await onAddTask(item.key, text)
    if (ok) setAddText('')            // keep the input open for rapid entry
  }

  function startEdit(task: UserTask) {
    setConfirmId(null)
    setEditingId(task.id)
    setEditText(task.label)
  }

  // Single commit point — both Enter and Escape blur the input, so this runs once.
  function commitEdit(task: UserTask) {
    setEditingId(null)
    if (editCancelRef.current) { editCancelRef.current = false; return }
    const text = editText.trim()
    if (text && text !== task.label) onSaveTaskLabel?.(task, text)
  }

  const taskActionBtn = { fontSize: 11, fontWeight: 500, color: 'rgba(19,4,38,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1.2 } as const
  const taskInputCls = 'flex-1 min-w-0 text-[12px] leading-snug text-[#130426] bg-white rounded px-1.5 py-0.5 outline-none'
  const taskInputStyle = { border: '1px solid rgba(19,4,38,0.25)' } as const

  // Split the row's surfaced items into three buckets:
  // - relevant documents: platform-document staticLinks ∪ matched document entries
  //   (deduped by document type) → always shown with a Not started / In progress status.
  //   staticLinks preserve their (possibly deep-linked, e.g. ?section=legal) href; matched
  //   docs use the canonical doc href. On a dup, the staticLink (deep link) wins.
  // - activity outputs: the user's matching activity entries → ItemMaterials cards.
  // - other static links: non-document links (external resources) → generic panel.
  const docFromStatic = (item.staticLinks ?? [])
    .map((l) => { const dt = documentTypeForHref(l.href); return dt ? { docType: dt, href: l.href } : null })
    .filter((x): x is { docType: DocumentType; href: string } => !!x)
  const docFromMatched = matched
    .filter((e) => e.document_type)
    .map((e) => ({ docType: e.document_type as DocumentType, href: DOCUMENT_TYPE_META[e.document_type as DocumentType].href }))
  const relevantDocs: { docType: DocumentType; href: string }[] = []
  const seenDocType = new Set<string>()
  for (const d of [...docFromStatic, ...docFromMatched]) {
    if (!seenDocType.has(d.docType)) { seenDocType.add(d.docType); relevantDocs.push(d) }
  }
  const activityOutputs = matched.filter((e) => !!e.activity)
  const otherStaticLinks = (item.staticLinks ?? []).filter((l) => !documentTypeForHref(l.href))

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
                  onChange={() => onToggle?.(idx)}
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
          {/* User-defined tasks — inline edit + confirm-delete; same visual
              treatment as platform checkboxes. */}
          {userTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-2.5 group">
              {editingId === task.id ? (
                <>
                  <input
                    type="checkbox"
                    checked={task.checked}
                    onChange={() => onToggleTask?.(task)}
                    className="mt-0.5 shrink-0 accent-[#DB5835]"
                    aria-label={task.label}
                  />
                  <input
                    ref={editInputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
                      else if (e.key === 'Escape') { editCancelRef.current = true; e.currentTarget.blur() }
                    }}
                    onBlur={() => commitEdit(task)}
                    className={taskInputCls}
                    style={taskInputStyle}
                  />
                </>
              ) : (
                <>
                  <label className="flex items-start gap-2.5 cursor-pointer min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={task.checked}
                      onChange={() => onToggleTask?.(task)}
                      className="mt-0.5 shrink-0 accent-[#DB5835]"
                    />
                    <span className={`text-[12px] leading-snug transition-colors ${task.checked ? 'text-[#130426]/40 line-through' : 'text-[#130426]/80'}`}>
                      {task.label}
                    </span>
                  </label>
                  <div className="flex items-center gap-3 shrink-0" style={{ marginTop: 1 }}>
                    <button onClick={() => startEdit(task)} style={taskActionBtn} className="hover:opacity-75 transition-opacity">Edit</button>
                    {confirmId === task.id ? (
                      <button
                        ref={confirmBtnRef}
                        onClick={() => { onDeleteTask?.(task); setConfirmId(null) }}
                        onBlur={() => setConfirmId(null)}
                        style={{ ...taskActionBtn, color: '#B23A1E', fontWeight: 600 }}
                        className="hover:opacity-75 transition-opacity"
                      >
                        Delete?
                      </button>
                    ) : (
                      <button onClick={() => setConfirmId(task.id)} style={taskActionBtn} className="hover:opacity-75 transition-opacity">Delete</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {/* Inline "+ Add task" — expanding input; Enter submits, Escape cancels,
              blur-while-empty collapses. Persist only on explicit submit (D3). */}
          {onAddTask && (
            addOpen ? (
              <input
                ref={addInputRef}
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void submitAdd() }
                  else if (e.key === 'Escape') { setAddOpen(false); setAddText('') }
                }}
                onBlur={() => { if (!addText.trim()) setAddOpen(false) }}
                placeholder="Add a task…"
                className={taskInputCls}
                style={{ ...taskInputStyle, marginLeft: 22 }}
              />
            ) : (
              <button
                onClick={() => setAddOpen(true)}
                style={{ fontSize: 12, fontWeight: 600, color: '#2C3777', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 22 }}
                className="hover:opacity-75 transition-opacity"
              >
                + Add task
              </button>
            )
          )}
        </div>
        {/* Relevant documents — always shown, with status */}
        <RelevantDocLinks docs={relevantDocs} startedDocTypes={startedDocTypes} />
        {/* Activity outputs — the user's created materials */}
        {activityOutputs.length > 0 && <ItemMaterials matched={activityOutputs} />}
        {/* Other static links (external resources / learn) — generic full-width panel */}
        {otherStaticLinks.length > 0 && (
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            {otherStaticLinks.map(({ href, label }) => (
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

// ItemMaterials renders the user's activity OUTPUTS for a row (relatedActivities).
// Relevant documents are rendered separately (RelevantDocLinks) so they can always
// appear and carry a status; this only receives activity entries.
//
// DORMANT BY DESIGN — this path currently never renders. Activities intentionally do NOT
// surface in the Plan section: they live in the "Relevant activities" section above Plan
// (driven by lib/areas.ts `area.activities`, with Start/Continue/Export). Documents on
// readiness rows surface via `staticLinks` (→ RelevantDocLinks) — the chosen mechanism.
// No readiness row in DOMAIN_STRUCTURES sets `relatedActivities`/`relatedDocumentTypes`
// (they're on orientation rows, which aren't rendered), so `itemEntries` returns nothing
// here. The plumbing is kept as a supported-but-unused future lever (e.g. an entry-gated
// document); if you ever add `relatedActivities` to a readiness row, activity outputs
// would start appearing in Plan — which is not the intended design. Don't remove.
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

// Reverse-map a static-link href to its platform document type (label-as-FK: identity
// via the canonical href, never prose). The query string is stripped first, so a
// deep-linked href (e.g. `/app/capture/personal-admin?section=legal`) still resolves to
// its document. Non-document links (external resources, learn pages) return null and
// keep their generic rendering.
function documentTypeForHref(href: string): DocumentType | null {
  const base = href.split('?')[0]
  const entry = (Object.entries(DOCUMENT_TYPE_META) as [DocumentType, { href: string }][]).find(([, m]) => m.href === base)
  return entry ? entry[0] : null
}

// RelevantDocLinks — the area's relevant platform documents for a readiness row. Always
// rendered (regardless of whether the user has started them — these come from staticLinks
// and/or relatedDocumentTypes), as a "Relevant document:" pill that hugs its text, with a
// Not started / In progress status badge to the right of the document name. Each doc keeps
// its own href so deep links (e.g. to a specific, expanded doc section) are preserved.
function RelevantDocLinks({ docs, startedDocTypes }: { docs: { docType: DocumentType; href: string }[]; startedDocTypes: Set<string> }) {
  if (docs.length === 0) return null
  return (
    <div className="mt-4 space-y-2">
      {docs.map(({ docType, href }) => {
        const meta = DOCUMENT_TYPE_META[docType]
        const started = startedDocTypes.has(docType)
        return (
          <a
            key={docType}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-75"
            style={{ display: 'flex', width: 'fit-content', maxWidth: '100%', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#F8F4EB', border: '1px solid #F29836', color: '#130426', textDecoration: 'none' }}
          >
            <EntryDocIcon />
            <span className="text-[13px] leading-snug">
              <span style={{ color: 'rgba(19,4,38,0.7)', fontWeight: 500 }}>Relevant document: </span>
              <span style={{ fontWeight: 600 }}>{meta.label}</span>
            </span>
            <DocStatusBadge started={started} />
            <span className="text-[11px] shrink-0" style={{ color: 'rgba(19,4,38,0.55)' }}>→</span>
          </a>
        )
      })}
    </div>
  )
}

function DocStatusBadge({ started }: { started: boolean }) {
  return started ? (
    <span style={{ flexShrink: 0, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600, color: '#8A3E18', background: 'rgba(216,90,48,0.18)', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>In progress</span>
  ) : (
    <span style={{ flexShrink: 0, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(19,4,38,0.7)', background: 'rgba(19,4,38,0.08)', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>Not started</span>
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
  note, idx = 0, onRemoveWrite, onRemoved, onMakeTask, onUpdated,
}: {
  note: Note
  idx?: number
  onRemoveWrite: () => void | Promise<void>   // DB write (hide / unlink); no parent state change
  onRemoved: () => void                        // parent drops the note from the stream
  onMakeTask: () => void                       // open the destination picker for this note
  onUpdated?: (newContent: string) => void
}) {
  const [removePhase, setRemovePhase] = useState<'idle' | 'show' | 'hide'>('idle')
  // Voice notes can only convert once a transcript exists (the label comes from
  // it). A click while still transcribing shows an inline note instead.
  const [taskBlocked, setTaskBlocked] = useState(false)
  const voicePending = note.note_mode === 'audio' && note.transcription_status !== 'complete'

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
  function handleMakeTaskClick() {
    if (voicePending) { setTaskBlocked(true); setTimeout(() => setTaskBlocked(false), 4000); return }
    onMakeTask()
  }
  const stickyBg = STICKY_COLORS[idx % STICKY_COLORS.length]

  const actionBtnStyle = { fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: '1.2' } as const

  const removeBtn = (
    <button onClick={handleRemove} style={actionBtnStyle} className="hover:opacity-75 transition-opacity">
      Remove
    </button>
  )
  const makeTaskBtn = (
    <button onClick={handleMakeTaskClick} style={{ ...actionBtnStyle, whiteSpace: 'nowrap' }} className="hover:opacity-75 transition-opacity">
      Convert to task
    </button>
  )

  if (removePhase !== 'idle') {
    return (
      <div style={{ opacity: removePhase === 'hide' ? 0 : 1, maxHeight: removePhase === 'hide' ? '0px' : '500px', overflow: 'hidden', transition: 'opacity 0.4s ease, max-height 0.4s ease' }}>
        <div style={{ background: '#F8F4EB', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center' }}>
          <p style={{ fontSize: 14, color: '#1A1A1A', margin: 0, lineHeight: 1.5 }}>Removed, still saved in Your materials.</p>
        </div>
      </div>
    )
  }

  if (note.note_mode === 'audio') {
    return (
      <VoiceNoteCard
        note={note}
        promptContext={note.origin_type === 'prompt' ? note.prompt_context ?? null : null}
        actions={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>{makeTaskBtn}{removeBtn}</div>
            {taskBlocked && (
              <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', margin: 0 }}>Still transcribing — try again once it&apos;s ready.</p>
            )}
          </div>
        }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <button onClick={onEdit} style={actionBtnStyle} className="hover:opacity-75 transition-opacity">
            Edit
          </button>
          {makeTaskBtn}
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
