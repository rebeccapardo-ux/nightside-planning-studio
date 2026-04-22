'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createNote,
  fetchNotes,
  type Note,
} from '@/lib/notes'
import VoiceNoteButton from './VoiceNoteButton'
import VoiceNotePlayback from './VoiceNotePlayback'

// ---------------------------------------------------------------------------
// RecentNoteItem — lightweight read-only row for the modal overlay
// ---------------------------------------------------------------------------

function RecentNoteItem({ note }: { note: Note }) {
  const timestamp = note.created_at
    ? new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null

  const isAudio = note.note_mode === 'audio'
  const preview = isAudio
    ? (note.transcript || note.content || '').slice(0, 120).trimEnd() + (note.transcript && note.transcript.length > 120 ? '…' : '')
    : note.content.length > 120
    ? note.content.slice(0, 120).trimEnd() + '…'
    : note.content

  return (
    <div className="py-3 border-b border-[#f8f4eb]/[0.07] last:border-0">
      {isAudio && (
        <p className="text-xs text-app-tertiary mb-1">🎤 Voice note</p>
      )}
      {preview ? (
        <p className="text-sm leading-relaxed text-[#f8f4eb]/70 whitespace-pre-wrap">{preview}</p>
      ) : isAudio && note.transcription_status === 'pending' ? (
        <p className="text-sm text-[#f8f4eb]/40 italic">Transcribing…</p>
      ) : null}
      {timestamp && (
        <p className="text-xs text-app-tertiary mt-1">{timestamp}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function NotepadModal({ variant = 'floating', buttonStyle = 'lavender' }: { variant?: 'floating' | 'panel'; buttonStyle?: 'lavender' | 'cream' }) {
  const [composerText, setComposerText] = useState('')
  const [saving, setSaving] = useState(false)

  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [notesLoaded, setNotesLoaded] = useState(false)

  const [isOpen, setIsOpen] = useState(false)
  const [showDiscardWarning, setShowDiscardWarning] = useState(false)

  const composerRef = useRef<HTMLTextAreaElement>(null)

  // Floating: load notes when modal opens (once)
  useEffect(() => {
    if (variant !== 'floating' || !isOpen || notesLoaded) return
    setLoadingNotes(true)
    fetchNotes().then((loadedNotes) => {
      setNotes(loadedNotes)
      setLoadingNotes(false)
      setNotesLoaded(true)
    })
  }, [variant, isOpen, notesLoaded])

  // Auto-resize composer textarea
  useEffect(() => {
    if (composerRef.current) {
      const el = composerRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [composerText])

  async function handleSave() {
    const trimmed = composerText.trim()
    if (!trimmed || saving) return

    setSaving(true)
    const created = await createNote(trimmed)
    if (created) {
      setNotes((prev) => [created, ...prev])
    }
    setComposerText('')
    setShowDiscardWarning(false)
    setSaving(false)
    if (isOpen) setIsOpen(false)
  }

  function handlePanelKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  function handleClose() {
    if (composerText.trim()) {
      setShowDiscardWarning(true)
      return
    }
    setIsOpen(false)
  }

  function handleDiscard() {
    setComposerText('')
    setShowDiscardWarning(false)
    setIsOpen(false)
  }

  // ─── Modal overlay ───────────────────────────────────────────────────────────
  // Simple: write + recent notes glimpse + path to full view. No editing controls.

  const recentNotes = notes.slice(0, 5)

  const modalOverlay = isOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-[#f8f4eb]/10 bg-[#16120f] p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-semibold text-[#f8f4eb]">Notepad</h2>
          <button onClick={handleClose} className="text-app-secondary hover:text-[#f8f4eb] transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {/* Composer */}
        <textarea
          value={composerText}
          onChange={(e) => { setComposerText(e.target.value); setShowDiscardWarning(false) }}
          onKeyDown={handleKeyDown}
          placeholder="Write whatever is coming up…"
          className="h-44 w-full rounded-lg bg-[#f8f4eb] px-4 py-3 text-[#130426] placeholder:text-[#130426]/45 text-sm leading-relaxed resize-none outline-none"
        />
        <div className="flex items-center justify-between mt-2 mb-3">
          <p className="text-sm text-[#f8f4eb]/70">Notes are saved to your materials</p>
          <button
            onClick={handleSave}
            disabled={saving || !composerText.trim()}
            className="rounded-full bg-[#f29836] text-[#130426] px-4 py-1.5 text-xs font-semibold hover:bg-[#DB5835] transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>

        {/* Voice note option */}
        <div className="mb-5">
          <VoiceNoteButton
            saveMode={{ kind: 'freeform' }}
            theme="dark"
            onSaved={(note) => {
              setNotes((prev) => [note, ...prev])
              setIsOpen(false)
            }}
          />
        </div>

        {showDiscardWarning && (
          <div className="mb-4 rounded-lg border border-[#f29836]/30 bg-[#f29836]/10 p-4">
            <p className="text-sm text-[#f8f4eb] mb-3">This note won't be saved if you close.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-[#f29836] text-[#130426] px-4 py-1.5 text-xs font-semibold"
              >
                {saving ? 'Saving…' : 'Save note'}
              </button>
              <button onClick={handleDiscard} className="text-xs text-[#f8f4eb]/70 hover:text-[#f8f4eb]">
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Recent notes — read-only glimpse */}
        {loadingNotes && (
          <p className="text-xs text-app-tertiary mb-4">…</p>
        )}

        {!loadingNotes && recentNotes.length > 0 && (
          <div className="border-t border-[#f8f4eb]/[0.07]">
            <p className="text-xs font-semibold uppercase tracking-wider text-app-tertiary pt-4 pb-1">
              Recent notes
            </p>
            <div className="max-h-52 overflow-y-auto">
              {recentNotes.map((note) => (
                <RecentNoteItem key={note.id} note={note} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-[#f8f4eb]/[0.07] flex items-center justify-between">
          <a
            href="/app/materials"
            className="text-xs text-[#BBABF4] hover:text-[#f8f4eb] transition-colors"
          >
            View all notes →
          </a>
          <button onClick={handleClose} className="text-xs text-app-secondary hover:text-[#f8f4eb] transition-colors">
            Close
          </button>
        </div>

      </div>
    </div>
  )

  // ─── Panel variant ───────────────────────────────────────────────────────────

  if (variant === 'panel') {
    return (
      <>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#f8f4eb]">Notepad</span>
            <button
              onClick={() => { setIsOpen(true); setShowDiscardWarning(false) }}
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
              className="w-full rounded-lg bg-[#f8f4eb] text-[#130426] placeholder:text-[#130426]/40 px-3 py-2 text-sm leading-relaxed resize-none outline-none overflow-hidden"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-app-tertiary">Notes are saved to your materials</p>
            {composerText.trim() && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs text-[#f8f4eb]/60 hover:text-[#f8f4eb] transition-colors"
              >
                {saving ? 'Saving…' : 'Save →'}
              </button>
            )}
          </div>
          <div className="mt-2 mb-4">
            <VoiceNoteButton
              saveMode={{ kind: 'freeform' }}
              theme="dark"
              onSaved={(note) => {
                setNotes((prev) => [note, ...prev])
              }}
            />
          </div>

        </div>

        {modalOverlay}
      </>
    )
  }

  // ─── Floating variant ────────────────────────────────────────────────────────

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setShowDiscardWarning(false) }}
        className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
          buttonStyle === 'cream'
            ? 'bg-[#f8f4eb] text-[#130426] hover:bg-[#BBABF4]'
            : 'bg-[#BBABF4] text-[#130426] hover:bg-[#f8f4eb]'
        }`}
      >
        ✎ Notepad
      </button>

      {modalOverlay}
    </>
  )
}
