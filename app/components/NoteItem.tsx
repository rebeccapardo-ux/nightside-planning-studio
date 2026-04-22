'use client'

import { useEffect, useRef, useState } from 'react'
import { updateNote, type Note } from '@/lib/notes'
import VoiceNotePlayback from './VoiceNotePlayback'

type Props = {
  note: Note
  isMarked: boolean
  onMark: (id: string) => void
  onUpdate: (id: string, content: string) => void
}

const textClass =
  'w-full text-base leading-relaxed text-[#f8f4eb]/85'

export default function NoteItem({ note, isMarked, onMark, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.content)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync when parent updates note content (e.g. edit in working set → notebook)
  useEffect(() => {
    if (!editing) setText(note.content)
  }, [note.content, editing])

  // Auto-resize textarea to match content
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [editing, text])

  function handleChange(value: string) {
    setText(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(value), 1500)
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setEditing(false)
    save(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setText(note.content)
      setEditing(false)
    }
  }

  async function save(content: string) {
    const trimmed = content.trim()
    if (!trimmed || trimmed === note.content) return
    const ok = await updateNote(note.id, trimmed)
    if (ok) onUpdate(note.id, trimmed)
  }

  const isAudio = note.note_mode === 'audio'

  return (
    <div className="flex group py-2">
      {/*
        Margin mark — a narrow strip on the left.
        Invisible at rest, faintly visible on hover, orange when marked.
        Click anywhere on this strip to toggle working-set membership.
      */}
      <button
        type="button"
        onClick={() => onMark(note.id)}
        tabIndex={-1}
        aria-label={isMarked ? 'Remove from view' : 'Hold in view'}
        className={`shrink-0 w-2 self-stretch mr-4 rounded-[1px] transition-colors duration-150 ${
          isMarked
            ? 'bg-[#f29836]/55'
            : 'bg-transparent group-hover:bg-[#f29836]/18'
        }`}
      />

      <div className="flex-1 min-w-0">
        {isAudio ? (
          <VoiceNotePlayback note={note} theme="dark" />
        ) : editing ? (
          <textarea
            ref={textareaRef}
            value={text}
            autoFocus
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={1}
            className={`${textClass} bg-transparent resize-none outline-none overflow-hidden`}
          />
        ) : (
          <p
            onClick={() => setEditing(true)}
            className={`${textClass} cursor-text whitespace-pre-wrap`}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  )
}
