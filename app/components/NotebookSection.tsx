'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchNotes, createNote, type Note } from '@/lib/notes'
import NoteItem from './NoteItem'

export default function NotebookSection() {
  const [notes, setNotes] = useState<Note[]>([])
  const [workingSet, setWorkingSet] = useState<string[]>([])
  const [composerText, setComposerText] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchNotes().then((loaded) => {
      setNotes(loaded)
      setLoading(false)
    })
  }, [])

  // Auto-resize composer as content grows
  useEffect(() => {
    if (composerRef.current) {
      const el = composerRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [composerText])

  async function handleCreate() {
    const trimmed = composerText.trim()
    if (!trimmed || creating) return
    setCreating(true)
    const created = await createNote(trimmed)
    if (created) {
      setNotes((prev) => [created, ...prev])
      setComposerText('')
    }
    setCreating(false)
  }

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter saves. Shift+Enter is a line break within the note.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCreate()
    }
  }

  function handleMark(id: string) {
    setWorkingSet((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleUpdate(id: string, content: string) {
    // Update the single source of truth — both notebook and working set reflect this
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)))
  }

  const markedNotes = notes.filter((n) => workingSet.includes(n.id))

  return (
    <div>
      {/* Working set — shown above notebook when notes are marked.
          References same note objects from state, no copies. */}
      {markedNotes.length > 0 && (
        <div className="mb-8 border-l-2 border-[#f29836]/35 pl-5 py-1">
          <p className="text-app-tertiary text-xs uppercase tracking-[0.12em] mb-2">
            In view
          </p>
          {markedNotes.map((note) => (
            <NoteItem
              key={`ws-${note.id}`}
              note={note}
              isMarked={true}
              onMark={handleMark}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {/*
        Notebook surface — composer and existing notes share identical styling.
        The composer is the first "slot" in the flow, not a separate control.
        Notes are separated only by spacing, not borders or cards.
      */}
      <div>
        {/* Composer — visually indistinct from a note, just empty */}
        <div className="flex py-2">
          <div className="shrink-0 w-2 mr-4" />{/* gutter spacer, matches NoteItem layout */}
          <textarea
            ref={composerRef}
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="write a note…"
            rows={1}
            className="w-full bg-transparent text-base leading-relaxed text-[#f8f4eb]/85 placeholder:text-[#f8f4eb]/22 resize-none outline-none overflow-hidden"
          />
        </div>

        {loading ? (
          <div className="flex py-2">
            <div className="shrink-0 w-2 mr-4" />
            <p className="text-app-tertiary text-base leading-relaxed">…</p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isMarked={workingSet.includes(note.id)}
              onMark={handleMark}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>
    </div>
  )
}
