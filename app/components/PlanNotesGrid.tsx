'use client'

import { useState } from 'react'
import DomainAssigner from '@/app/components/DomainAssigner'
import VoiceNoteCard from '@/app/components/notes/VoiceNoteCard'
import { deleteNote, updateNote } from '@/lib/notes'
import type { Container } from '@/lib/notes'

type NoteRow = {
  id: string
  content: string | null
  origin_type: string | null
  prompt_context: string | null
  note_mode: string | null
  transcript: string | null
  audio_url?: string | null
  duration_seconds?: number | null
  transcription_status?: 'pending' | 'complete' | 'failed' | null
}

const STICKY_COLORS = ['#f5f2e3', '#eae7f5', '#f3ede8']
const MAX_VISIBLE = 5

const inter = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function PlanNotesGrid({
  notes: initialNotes,
  allDomains,
}: {
  notes: NoteRow[]
  allDomains: Container[]
}) {
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const visibleNotes = showAll ? notes : notes.slice(0, MAX_VISIBLE)
  const hasMore = notes.length > MAX_VISIBLE

  function startEdit(note: NoteRow) {
    setEditingId(note.id)
    setEditDraft(note.content ?? '')
  }

  async function saveEdit(id: string) {
    const trimmed = editDraft.trim()
    if (trimmed) {
      await updateNote(id, trimmed)
      setNotes((prev) => prev.map((n) => n.id === id ? { ...n, content: trimmed } : n))
    }
    setEditingId(null)
  }

  async function confirmDelete(id: string) {
    await deleteNote(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setConfirmDeleteId(null)
  }

  if (notes.length === 0) return null

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 16,
          paddingTop: 14,
        }}
      >
        {visibleNotes.map((note, idx) => {
          const isVoice = note.note_mode === 'audio'

          // Voice notes render as a dedicated card with waveform
          if (isVoice) {
            const noteObj = {
              id: note.id,
              content: note.content ?? '',
              created_at: '',
              updated_at: '',
              note_mode: 'audio' as const,
              audio_url: note.audio_url ?? null,
              transcript: note.transcript ?? null,
              duration_seconds: note.duration_seconds ?? null,
              transcription_status: note.transcription_status ?? null,
            }
            return (
              <VoiceNoteCard
                key={note.id}
                note={noteObj}
                promptContext={note.origin_type === 'prompt' ? note.prompt_context : null}
                actions={
                  <>
                    <DomainAssigner
                      itemId={note.id}
                      itemType="note"
                      allDomains={allDomains}
                      initialLinkedDomainIds={[]}
                      label="Add to"
                      theme="light"
                      showCount={false}
                      buttonVariant="pill"
                    />
                    <button
                      onClick={() => setConfirmDeleteId(note.id)}
                      style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(19,4,38,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      className="hover:opacity-75 transition-opacity"
                    >
                      {confirmDeleteId === note.id ? (
                        <span style={{ display: 'inline-flex', gap: 6 }}>
                          <button onClick={(e) => { e.stopPropagation(); confirmDelete(note.id) }} style={{ fontSize: 12, fontWeight: 600, color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }} style={{ fontSize: 12, color: 'rgba(19,4,38,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancel</button>
                        </span>
                      ) : 'Delete'}
                    </button>
                  </>
                }
              />
            )
          }

          // Text notes render as sticky squares
          const bg = STICKY_COLORS[idx % STICKY_COLORS.length]
          const displayText = note.content?.trim() || note.transcript?.trim() || null
          const isEditing = editingId === note.id
          const isConfirmingDelete = confirmDeleteId === note.id

          return (
            <div key={note.id} style={{ position: 'relative' }}>
              {/* tape */}
              <div
                style={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%) rotate(-1deg)',
                  width: 36,
                  height: 20,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  zIndex: 1,
                }}
              />
              {/* card */}
              <div
                style={{
                  backgroundColor: bg,
                  aspectRatio: '1/1',
                  boxShadow: '3px 3px 8px rgba(19,4,38,0.20)',
                  border: '1.5px solid rgba(120,90,60,0.22)',
                  padding: '20px 12px 10px',
                  borderRadius: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* content area */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {isConfirmingDelete ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontFamily: inter, fontSize: 12, color: '#1a1a1a', lineHeight: 1.4, margin: 0 }}>
                        This will permanently delete this note.
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => confirmDelete(note.id)}
                          style={{ fontFamily: inter, fontSize: 12, fontWeight: 600, color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ fontFamily: inter, fontSize: 12, color: 'rgba(19,4,38,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isEditing ? (
                    <textarea
                      // eslint-disable-next-line jsx-a11y/no-autofocus -- focus on user-triggered edit mode
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={() => saveEdit(note.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(note.id) }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      style={{
                        fontFamily: inter,
                        fontSize: 14,
                        fontWeight: 400,
                        lineHeight: 1.5,
                        color: '#1a1a1a',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        width: '100%',
                        height: '100%',
                      }}
                      rows={4}
                    />
                  ) : (
                    <>
                      <p
                        style={{
                          fontFamily: inter,
                          fontSize: 14,
                          fontWeight: 400,
                          lineHeight: 1.5,
                          color: '#1a1a1a',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {displayText ?? <em style={{ opacity: 0.5 }}>Voice note</em>}
                      </p>
                      {note.prompt_context && displayText && (
                        <p
                          style={{
                            fontFamily: inter,
                            fontSize: 11,
                            color: 'rgba(19,4,38,0.7)',
                            marginTop: 6,
                            marginBottom: 0,
                            borderTop: '1px solid rgba(0,0,0,0.08)',
                            paddingTop: 5,
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {note.prompt_context}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* actions */}
                {!isEditing && !isConfirmingDelete && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <DomainAssigner
                        itemId={note.id}
                        itemType="note"
                        allDomains={allDomains}
                        initialLinkedDomainIds={[]}
                        label="Add to"
                        showCount={false}
                        theme="light"
                        buttonVariant="pill"
                      />
                    </div>
                    <button
                      onClick={() => startEdit(note)}
                      style={{ fontFamily: inter, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(note.id)}
                      style={{ fontFamily: inter, fontSize: 12, fontWeight: 500, color: 'rgba(19,4,38,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            fontFamily: inter,
            fontSize: 14,
            fontWeight: 500,
            color: '#130426',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginTop: 16,
            display: 'block',
          }}
          className="hover:underline transition-all"
        >
          View all notes ({notes.length}) →
        </button>
      )}
    </div>
  )
}
