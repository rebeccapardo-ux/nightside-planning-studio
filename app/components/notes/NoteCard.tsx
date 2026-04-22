'use client'

import React, { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Shared text note card — sticky visual variant with editable content.
// Voice notes use VoiceNoteCard instead.
// ---------------------------------------------------------------------------

export type NoteCardActions = React.ReactNode

type NoteCardProps = {
  content: string
  promptContext?: string | null
  onContentSave?: (newContent: string) => void
  actions: NoteCardActions
  stickyStyle?: React.CSSProperties
  embellishment?: React.ReactNode
}

export default function NoteCard({
  content,
  promptContext,
  onContentSave,
  actions,
  stickyStyle,
  embellishment,
}: NoteCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setDraft(content) }, [content])

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current
      el.focus()
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
      el.selectionStart = el.selectionEnd = el.value.length
    }
  }, [editing])

  function handleEditInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  async function handleSave() {
    const trimmed = draft.trim()
    setEditing(false)
    if (!trimmed || trimmed === content.trim()) return
    onContentSave?.(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') { setDraft(content); setEditing(false) }
  }

  const hasPrompt = !!(promptContext && promptContext.trim())

  const baseStyle: React.CSSProperties = {
    padding: '12px',
    borderRadius: '12px',
    minHeight: '110px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    ...stickyStyle,
  }

  return (
    <div style={baseStyle}>
      {embellishment}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {editing ? (
          <textarea
            ref={editRef}
            value={draft}
            onChange={handleEditInput}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full bg-transparent resize-none outline-none overflow-hidden"
            style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.5', color: '#1a1a1a' }}
          />
        ) : (
          <p
            className="whitespace-pre-wrap"
            style={{
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1.5',
              color: '#1a1a1a',
              cursor: onContentSave ? 'text' : 'default',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            onClick={() => { if (onContentSave) setEditing(true) }}
          >
            {content}
          </p>
        )}

        {hasPrompt && !editing && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '6px', marginTop: '8px' }}>
            <p style={{
              fontSize: '12px',
              lineHeight: '1.4',
              color: 'rgba(0,0,0,0.55)',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {promptContext}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        marginTop: '10px',
        paddingTop: '6px',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {onContentSave && !editing && (
          <button
            onClick={() => setEditing(true)}
            style={{ fontSize: '12px', fontWeight: 400, color: '#2C3777', lineHeight: '1.2' }}
            className="hover:opacity-75 transition-opacity"
          >
            Edit
          </button>
        )}
        {actions}
      </div>
    </div>
  )
}
