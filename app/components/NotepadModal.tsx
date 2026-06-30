'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createNote, updateNote, addNoteToContainer } from '@/lib/notes'
import { holdSavingIndicator } from '@/lib/ui'
import VoiceNoteButton from './VoiceNoteButton'
import AutosaveNotice from './AutosaveNotice'
import type { Note } from '@/lib/notes'

export default function NotepadModal({
  variant = 'floating',
  buttonStyle = 'lavender',
  size = 'default',
  containerId = null,
}: {
  variant?: 'floating' | 'panel'
  buttonStyle?: 'lavender' | 'cream' | 'orange' | 'midnight' | 'navy' | 'sunrise'
  size?: 'default' | 'sm'
  // When set (the Notepad is open on an area page), notes composed here link to that
  // area's container so they surface in its Your-Thoughts panel. Null elsewhere.
  containerId?: string | null
}) {
  const [composerText, setComposerText] = useState('')
  const [saving, setSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)

  // Lets a successful save re-run the underlying page's server components (e.g.
  // the Plan page's notes query) so a note saved in-place shows up without a
  // manual browser refresh. The modal is global (LayoutShell), so saves can
  // happen on top of any page with no navigation to otherwise trigger a refetch.
  const router = useRouter()

  const composerRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── One modal session = one note ──────────────────────────────────────────────
  // Background autosave persists to a SINGLE note for the open session: the first
  // save creates it, later saves update the same row (no per-pause fragmentation),
  // and the field never auto-clears. Saves are serialized through a chain so the
  // latest content always wins, including the final save on close.
  const sessionNoteIdRef = useRef<string | null>(null)
  const contentRef = useRef('')
  const saveChainRef = useRef<Promise<void>>(Promise.resolve())
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ghost hover preview is always cream with dark text (matches the plan page),
  // on every route — so the placeholder is legible regardless of page theme.
  const ghost = {
    bg: '#F8F4EB',
    border: '1px solid rgba(19,4,38,0.20)',
    shadow: '0 8px 32px rgba(0,0,0,0.30)',
    textareaBg: 'rgba(19,4,38,0.07)',
    textareaBorder: '1px solid rgba(19,4,38,0.18)',
    placeholderClass: 'placeholder:text-[#130426]/70',
    iconColor: '#130426',
    labelColor: '#130426',
  }

  // Auto-resize panel composer textarea
  useEffect(() => {
    if (composerRef.current) {
      const el = composerRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [composerText])

  // Persist the latest content: create the session's note on the first save, then
  // update that same row on every later save (one session = one note).
  async function persist() {
    const content = contentRef.current.trim()
    if (!content) return
    setSaving(true)
    const startedAt = Date.now()
    try {
      let ok = false
      if (!sessionNoteIdRef.current) {
        const note = await createNote(content)
        if (note) {
          sessionNoteIdRef.current = note.id; ok = true
          // Link to the area container ONCE, on first creation. Later saves take the
          // update branch below, so this never re-links the same note.
          if (containerId) await addNoteToContainer(note.id, containerId)
        }
      } else {
        ok = await updateNote(sessionNoteIdRef.current, content)
      }
      // Keep "Saving…" visible long enough to register even when the save is fast.
      await holdSavingIndicator(startedAt)
      if (ok) {
        setConfirmVisible(true)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setConfirmVisible(false), 2000)
      }
      // On failure, the id/content are kept; the next save retries transparently.
    } finally {
      setSaving(false)
    }
  }

  // Serialize saves so they never overlap and run in order. The returned promise
  // resolves once this save (and anything queued before it) has landed — close
  // uses it to commit the final content before refreshing the plan page.
  function queueSave(): Promise<void> {
    const next = saveChainRef.current.then(() => persist())
    saveChainRef.current = next.catch(() => {})
    return next
  }

  // ── Panel save ────────────────────────────────────────────────────────────────

  async function handleSave() {
    const trimmed = composerText.trim()
    if (!trimmed || saving) return
    setSaving(true)
    const saved = await createNote(trimmed)
    if (saved && containerId) await addNoteToContainer(saved.id, containerId)
    setComposerText('')
    setSaving(false)
    if (saved) router.refresh()
  }

  function handlePanelKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  function handleClose() {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
    setIsOpen(false)
    setConfirmVisible(false)
    // Commit the latest content (create or update the session's note), then refresh
    // the plan page. Fire-and-forget so the close is instant; the save chain
    // guarantees the final content lands even if a background save was in flight.
    if (contentRef.current.trim() || sessionNoteIdRef.current) {
      void queueSave().then(() => router.refresh())
    }
  }

  function openModal() {
    setIsOpen(true)
    setComposerText('')
    setConfirmVisible(false)
    // Fresh note each session — no draft restoration, no prior content shown.
    sessionNoteIdRef.current = null
    contentRef.current = ''
  }

  // Close on Escape while the modal is open. Native textarea Escape is inert, so
  // there's no conflict with typing.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ─── Modal overlay ────────────────────────────────────────────────────────────

  const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  const modalOverlay = isOpen && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-white/10 p-6 shadow-2xl" style={{ background: '#2d3a6b' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#f8f4eb]">Notepad</h2>
          <button
            onClick={handleClose}
            className="transition-colors text-xl leading-none hover:opacity-100"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            ×
          </button>
        </div>

        {/* Helper text */}
        <AutosaveNotice theme="dark" style={{ marginBottom: 16, fontStyle: 'normal', fontSize: 15, fontWeight: 500, color: 'rgba(248,244,235,0.92)' }} />

        {/* Composer */}
        <textarea
          value={composerText}
          placeholder="Capture a thought, question, or anything on your mind…"
          className="h-44 w-full text-[#130426] placeholder:text-[#130426]/65 text-sm leading-relaxed resize-none outline-none"
          style={{ background: '#ffffff', border: '1.5px solid rgba(26,26,26,0.15)', borderRadius: 10, padding: '12px 16px' }}
          onChange={(e) => {
            const text = e.target.value
            setComposerText(text)
            contentRef.current = text
            // Background autosave on a pause — never clears the field and updates the
            // session's single note. The final save happens on close.
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => { void queueSave() }, 1500)
          }}
        />

        {/* Save status */}
        <div style={{ margin: '6px 0 16px', minHeight: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
          {saving && (
            <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Saving…</span>
          )}
          {confirmVisible && !saving && (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,0.75)" strokeWidth="1.3" />
                <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: hv, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Saved to Your Materials</span>
            </>
          )}
        </div>

        {/* Voice note */}
        <div className="mb-4">
          <VoiceNoteButton
            saveMode={{ kind: 'freeform' }}
            theme="dark"
            onSaved={async (note: Note) => {
              // finalNote (incl. transcript, or 'failed' status) is already
              // persisted by the time onSaved fires, so the refetch reflects it.
              // Link to the area container first (when composed from an area page).
              if (containerId && note?.id) await addNoteToContainer(note.id, containerId)
              router.refresh()
              setTimeout(() => setIsOpen(false), 3000)
            }}
          />
        </div>

      </div>
    </div>
  )

  // ─── Panel variant ────────────────────────────────────────────────────────────

  if (variant === 'panel') {
    return (
      <>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#f8f4eb]">Notepad</span>
            <button
              onClick={openModal}
              className="rounded-full bg-[#f8f4eb] text-[#2C3777] hover:bg-[#BBABF4] transition-colors px-3 py-1 text-xs font-semibold"
            >
              ✎ Open notepad
            </button>
          </div>
          <div className="mb-1">
            <textarea
              ref={composerRef}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={handlePanelKeyDown}
              placeholder="Write a note…"
              rows={2}
              className="w-full rounded-lg bg-[#f8f4eb] text-[#130426] placeholder:text-[#130426]/65 px-3 py-2 text-sm leading-relaxed resize-none outline-none overflow-hidden"
            />
          </div>
          <div className="flex items-center justify-end" style={{ minHeight: 36 }}>
            {composerText.trim() && (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: hv,
                  color: '#f8f4eb',
                  background: 'transparent',
                  border: '1px solid rgba(248,244,235,0.4)',
                  borderRadius: 4,
                  padding: '8px 16px',
                  cursor: !saving ? 'pointer' : 'default',
                  opacity: !saving ? 1 : 0.4,
                }}
              >
                {saving ? 'Saving…' : 'Add note'}
              </button>
            )}
          </div>
          <div className="mt-2 mb-4">
            <VoiceNoteButton
              saveMode={{ kind: 'freeform' }}
              theme="dark"
              onSaved={(note: Note) => { if (containerId && note?.id) void addNoteToContainer(note.id, containerId) }}
            />
          </div>
        </div>
        {modalOverlay}
      </>
    )
  }

  // ─── Floating variant ─────────────────────────────────────────────────────────

  const showGhost = isHovered && !isOpen

  return (
    <>
      <div
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Notepad button */}
        {size === 'sm' ? (
          <button
            onClick={openModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 30,
              borderRadius: 20,
              paddingLeft: 14,
              paddingRight: 14,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              border: '1px solid rgba(187,171,244,0.6)',
              cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
              background: buttonStyle === 'cream' ? '#f8f4eb' : buttonStyle === 'orange' ? '#DB5835' : buttonStyle === 'midnight' ? '#130426' : buttonStyle === 'navy' ? '#2C3777' : buttonStyle === 'sunrise' ? '#F29836' : '#BBABF4',
              color: buttonStyle === 'midnight' || buttonStyle === 'navy' ? '#f8f4eb' : '#130426',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <rect x="2.5" y="1" width="8" height="10.5" rx="1.5" stroke="#130426" strokeWidth="1.3" />
              <path d="M4.5 4h4M4.5 6.5h4M4.5 9h2.5" stroke="#130426" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Notepad
          </button>
        ) : (
          <button
            onClick={openModal}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
              buttonStyle === 'cream'
                ? 'bg-[#f8f4eb] text-[#130426] hover:bg-[#BBABF4]'
                : buttonStyle === 'orange'
                ? 'bg-[#DB5835] text-[#130426] hover:bg-[#C04828]'
                : buttonStyle === 'midnight'
                ? 'bg-[#130426] text-[#f8f4eb] hover:bg-[#200840]'
                : buttonStyle === 'navy'
                ? 'bg-[#2C3777] text-[#f8f4eb] hover:bg-[#3d4e8f]'
                : buttonStyle === 'sunrise'
                ? 'bg-[#F29836] text-[#130426] hover:bg-[#e08a25]'
                : 'bg-[#BBABF4] text-[#130426] hover:bg-[#f8f4eb]'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M11.5 6L6.5 11C5.4 12.1 3.6 12.1 2.5 11C1.4 9.9 1.4 8.1 2.5 7L8 1.5C8.8 0.7 10.2 0.7 11 1.5C11.8 2.3 11.8 3.7 11 4.5L5.5 10C5.1 10.4 4.4 10.4 4 10C3.6 9.6 3.6 8.9 4 8.5L9 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Notepad
          </button>
        )}

        {/* Ghost preview panel — appears below button on hover */}
        <div
          onClick={openModal}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 260,
            background: ghost.bg,
            border: ghost.border,
            borderRadius: 12,
            padding: 14,
            boxShadow: ghost.shadow,
            opacity: showGhost ? 1 : 0,
            transform: showGhost ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            pointerEvents: showGhost ? 'auto' : 'none',
            zIndex: 50,
            cursor: 'pointer',
          }}
        >
          {/* Ghost textarea — read-only preview */}
          <textarea
            readOnly
            tabIndex={-1}
            placeholder="Capture a thought..."
            style={{
              display: 'block',
              width: '100%',
              height: 80,
              background: ghost.textareaBg,
              border: ghost.textareaBorder,
              borderRadius: 8,
              padding: '10px 12px',
              resize: 'none',
              outline: 'none',
              fontSize: 13,
              lineHeight: 1.5,
              cursor: 'pointer',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            className={ghost.placeholderClass}
          />

          {/* Ghost voice row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
            <svg width="11" height="15" viewBox="0 0 12 16" fill="none" aria-hidden>
              <rect x="2.5" y="0.5" width="7" height="9" rx="3.5" fill={ghost.iconColor} />
              <path d="M0.5 8c0 2.76 2.24 5 5.5 5s5.5-2.24 5.5-5" stroke={ghost.iconColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <line x1="6" y1="13" x2="6" y2="15.5" stroke={ghost.iconColor} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3.5" y1="15.5" x2="8.5" y2="15.5" stroke={ghost.iconColor} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 12, color: ghost.labelColor }}>Record a voice note</span>
          </div>
        </div>
      </div>

      {modalOverlay}
    </>
  )
}
